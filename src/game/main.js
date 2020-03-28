game.module(
    'game.main'
)
.require(
    'plugin.p2'    
)
.body(function() {

game.createScene('Main', {
    car: null,
    pilot: null,
    track: null,
    camera: null,
    radius: 40,
    trackPos: new game.Vector(0,0),
    
    init: function() {
        var curve = new Bezier(150,40 , 80,30 , 105,150);

        this.world = new game.Physics({gravity: [0, 0]});

        var bg = new game.Graphics();
        bg.drawRect(0, 0, game.width, game.height);
        bg.addTo(this.stage);
        
        var container = new game.Container();
        container.addTo(this.stage);
        
        var bgContainer = new game.Container();
        bgContainer.addTo(container);
        this.track = new game.TrackSegmentQueue(bgContainer);
        
        var spriteContainer = new game.Container();
        spriteContainer.addTo(bgContainer);
        spriteContainer.swap(this.track.peakNext().shape);
        
        this.pilot = new game.Pilot(this.track, spriteContainer);
        var genOnContact = function(pilot) {
            return function() {
                if(!pilot.tween.playing)
                    pilot.toNext();
            }
        }
        this.world.on("beginContact", genOnContact(this.pilot));
        this.car = new game.Car(spriteContainer);
        this.car.follows = this.pilot.genGetFollowing();

        this.tracker = new game.Tracker(this.track, spriteContainer);//Woot wooot, WOOOT?
        this.tracker.follows = this.car.genGetFollowing();

        this.camera = new game.Camera();
        this.camera.addTo(bgContainer);
        this.camera.setTarget(this.car.sprite);
    },
    
    update: function() {
        this.world.step(1/60);
        
        if(game.keyboard.down('SPACE')) {
            if(!this.car.follows)
                this.car.follows = this.pilot.genGetFollowing();
        }
        if(game.keyboard.down('W')) {
            this.pilot.tween.pause();
        }
        if(game.keyboard.down('S')) {
            this.pilot.tween.resume();
        }
        if(game.keyboard.down('UP')) {
            this.pilot.stop();
            this.car.forward();
        }
        if(game.keyboard.down('LEFT')) {
            this.car.turnLeft();
        }
        if(game.keyboard.down('RIGHT')) {
            this.car.turnRight();
        } 
    }
});

game.createClass('Car', {
    size: 30,
    speed: 300,
    sprite: null,
    follows: null,
    
    init: function(container) {
        this.sprite = new game.Sprite('media/car.png');
        this.sprite.alpha = 0.8;
        this.sprite.anchor.set(25, 25);
        
        container.addChild(this.sprite);
       
        this.shape = new game.Graphics();
        this.shape.fillColor = 'green';
        this.shape.drawCircle(0, 0, 20);
        this.sprite.addChild(this.shape);
        bodyShape = new p2.Circle({radius: 0.2});
        bodyShape.angle = 2/Math.PI;
        
        this.body = new p2.Body({mass:1000});
        this.body.addShape(bodyShape);
        game.scene.world.addBody(this.body);
    },
    
    update: function() {
        if(this.follows)
        {
            var followCoords = this.follows();
            this.body.position[0] = followCoords[0] / this.body.world.ratio;
            this.body.position[1] = followCoords[1] / this.body.world.ratio;
            this.body.angle = followCoords[2];
        }
        this.sprite.x = this.body.position[0] * this.body.world.ratio;
        this.sprite.y = this.body.position[1] * this.body.world.ratio;
        this.sprite.rotation = this.body.angle;
    },

    forward: function() {
        this.follows = null;
        hyp = 1000;
        this.body.force =   [  hyp * Math.sin(this.body.angle) ,  hyp * -Math.cos(this.body.angle)];
    },
    turnLeft: function() {
        this.body.angle -= Math.PI * game.delta;
    },
    turnRight: function() {
        this.body.angle += Math.PI * game.delta;
    },

    genGetFollowing: function() {
        var sprite = this.sprite;
        return function() {
            return [sprite.position.x, sprite.position.y, sprite.rotation];
        }
    }

});

game.createClass('Tracker', {
    follows: null,

    init: function(trackQueue, container) {
        this.shape = new game.Graphics();
        this.shape.fillColor = 'yellow';
        this.shape.drawCircle(0, 0, 4);
        this.shape.addTo(container);
        this.update = this.genOnUpdate(trackQueue);
    },

    genOnUpdate: function(trackQueue) {
        return function() {
            if(this.follows) {
                var pos = this.follows();
                trackQueue.currentSegment.curve.point(0.5, this.shape.position);
            }
        }
    }
});

game.createClass('Coach', {
    init: function(trackQueue, container, shape) {
        this.shape = shape;
        this.onRepeat = this.genOnRepeat(trackQueue, container, this.shape);
        this.toNext = this.genToNext(trackQueue);
    },

    genToNext: function(trackQueue)
    {
        return function()
        {
            this.onRepeat();
            trackQueue.currentSegment.curve.point(0.0, this.shape.position);
        }
    },

    genGetFollowing: function(){
        this.tween = this.genCurveTween();
        this.tween.start();
        var shape = this.shape;
        return function() {
            return [shape.position.x, shape.position.y, shape.rotation];
        }
    },

    genOnRepeat: function(trackQueue, container, shape) {
        clearing = this.clearing;
        return function() {
            if(trackQueue.peakNext()){
                trackQueue.moveToNext();
                container.swap(trackQueue.currentSegment.shape);
            }

            while(shape.position.distance(trackQueue.tail.curve.end) > clearing*trackQueue.tail.length) {
                trackQueue.remove();
            }
            
            while(shape.position.distance(trackQueue.head.curve.end) < clearing*trackQueue.head.length) {
                trackQueue.add();
            }
        }
    },
});

game.createClass('Pilot', 'Coach', {
    speed: 2000,
    size: 10,
    clearing: 30,
    shape: null,
    
    init: function(trackQueue, container) {

        this.shape = new game.Graphics();
        this.shape.fillColor = 'black';
        this.shape.alpha = 0.2;
        this.shape.drawCircle(0, 0, 10*this.size);
        this.shape.addTo(container);

        this.super(trackQueue, container, this.shape);
        this.onUpdate = this.genOnUpdate(trackQueue, this.shape);
        
        this.body = new p2.Body({mass: 0});
        this.body.type = p2.Body.STATIC;
        this.body.collisionResponse = false;
        this.body.damping = 0;
        var sensorShape = new p2.Circle({radius: 10 * this.size / game.scene.world.ratio});
        this.body.addShape(sensorShape);
        game.scene.world.addBody(this.body);

    },
    update: function() {
        this.body.position[0] = this.shape.x / this.body.world.ratio;
        this.body.position[1] = this.shape.y / this.body.world.ratio;
    },

    stop: function()
    {
        if(this.tween.playing) {
            this.tween.stop();
            this.toNext();
        }
    },

    genOnUpdate: function(trackQueue, shape) {
        return function() {
            var prevPoint = new game.Vector(this.position.x, this.position.y);
            trackQueue.currentSegment.curve.point(this.percent, this.position);
            shape.rotation = prevPoint.angle(this.position) + Math.PI/2;
        }
    },

    genCurveTween: function() {
        var props = {
            percent: 1 
        };
        
        this.settings = {
            repeat: Infinity,
            yoyo: false,
            easing: 'Linear.None',
        };
        
        var tween = game.Tween.add(this.shape, props, this.speed, this.settings);
        tween.object.percent = 0;
        
        tween.onUpdate(this.onUpdate);
        tween.onRepeat(this.onRepeat);

        return tween;
    }
});

game.createClass('TrackBoundaries', {
    init: function() {
        this.dbgShape = new game.Graphics();
        this.dbgShape.fillColor = 'yellow';
        this.dbgShape.drawCircle(0, 0, 6);
        this.dbgShape.addTo(this.container);
    }
});

game.createClass('TrackSegmentQueue', {
     currentSegment: null,
     tail: null,
     head: null,
     
     init: function(container) {
        this.tail = new game.TrackSegment(container);
        this.head = new game.TrackSegment(container, this.tail);
        this.currentSegment = this.tail;
        this.currentSegment.nextSegment = this.head;
     },
     
     peakNext: function() {
         return this.currentSegment.nextSegment;
     },
     
     moveToNext: function() {
         this.currentSegment = this.currentSegment.nextSegment;
     },
     
     add: function() {
         this.head.nextSegment = new game.TrackSegment(this.container, this.head);
         this.head = this.head.nextSegment;
     },
     
     remove: function() {
         var disposed = this.tail;
         this.tail = this.tail.nextSegment;
         disposed.shape.remove();
     },
});

game.createClass('TrackSegment', {
    length: 800,
    width: 200,
    curvature: Math.PI/2,
    turnAngle: Math.PI/2,
    curve: null,
    prevSegment: null,
    nextSegment: null,
    container: null,
    shape: null,
    
    init: function(container, prevSegment) {
        this.container = container;
        if(prevSegment == null) {
            this.curve = this.startCurve();   
        } else {
            this.curve = this.continuingCurve(prevSegment);
        }
        this.shape = new game.Graphics();
        this.shape.lineWidth = this.width;
        this.shape.lineColor = 'blue';
        this.shape.drawCurve(this.curve);
        this.shape.lineWidth = this.width * 0.9;
        this.shape.lineColor = 'white';
        this.shape.drawCurve(this.curve);
        this.shape.addTo(this.container);

    },

    startCurve: function() {
        length = this.length;
        var tail = new game.Vector(game.width / 2, game.height / 2);
        var head = tail.clone();
        head.move(length, -Math.PI / 2);
       
        return new game.Curve(tail.x, tail.y, head.x, head.y, tail.x, tail.y, tail.x, tail.y);
    },
    
    continuingCurve: function(prevSegment) {
        this.container = prevSegment.container;
        var length = this.length;
        var direction = (prevSegment.curve.start.angle(prevSegment.curve.end) - this.turnAngle / 2) + (Math.random() * this.turnAngle);
        var head = prevSegment.curve.end.clone();
        head.move(length, direction);
        
        var controlHandle = head.clone();
        var controlAngle = (head.angle(prevSegment.curve.end) - this.curvature/2) + (Math.random() * this.curvature);
        controlHandle.move(length / 2, controlAngle);
        
        var startHandle = prevSegment.curve.handle2.clone();
        var angle = prevSegment.curve.handle2.angle(prevSegment.curve.end);
        var distance = prevSegment.curve.handle2.distance(prevSegment.curve.end);
        startHandle.move(distance * 2, angle);
       
        var curve = new game.Curve(prevSegment.curve.end.x, prevSegment.curve.end.y, head.x, head.y, 
        startHandle.x, startHandle.y, controlHandle.x, controlHandle.y);
        
        prevSegment.nextSegment = this;
        return curve;
    }
});

});
