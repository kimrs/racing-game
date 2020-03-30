game.module(
    'game.main'
)
.require(
    'plugin.p2'    
)
.body(function() {



var DBG_GRAPHICS = false;
var PILOT = 42;
game.addAsset('grass_texture_4.jpg')
game.createScene('Main', {
    car: null,
    pilot: null,
    track: null,
    camera: null,
    radius: 40,
    trackPos: new game.Vector(0,0),
    mousepnt: new game.Vector(0,0),
    
    init: function() {
        this.world = new game.Physics({gravity: [0, 0]});
        this.world.defaultContactMaterial.friction = 0;
        this.world.defaultContactMaterial.restitution = 2;

        var container = new game.Container();
        container.addTo(this.stage);
        
        var bgContainer = new game.Container();
        var bg = new game.Background(bgContainer);
       // bg.follows  = function(x) {
       //     return function() {
       //         return x;
       //     }
       // }(this.mousepnt);

        bgContainer.addTo(container);
        this.track = new game.TrackSegmentQueue(bgContainer);
        
        var spriteContainer = new game.Container();
        spriteContainer.addTo(bgContainer);
        spriteContainer.swap(this.track.peakNext().shape);
        
        this.pilot = new game.Pilot(this.track, spriteContainer);
        var genOnContact = function(pilot) {
            return function(event) {
                if((event.bodyA.id == PILOT || event.bodyB.id == PILOT) && !pilot.tween.playing)
                    pilot.toNext();
            }
        }

        this.world.on("beginContact", genOnContact(this.pilot));
        this.car = new game.Car(spriteContainer);
        this.car.follows = this.pilot.genGetFollowing();
        this.crosshair = new game.Crosshair(this.track, container);
        this.crosshair.follows = this.car.genGetFollowing();

        this.tracker = new game.Tracker(this.track, spriteContainer);
        this.tracker.follows = this.car.genGetFollowing();
        this.follows = this.car.genGetFollowing();
        bg.follows = this.car.genGetFollowing();

        this.camera = new game.Camera();
        this.camera.addTo(container);
        this.camera.setTarget(this.car.sprite);
    },

    mousedown: function(x, y) {
        this.pilot.stop();
        this.car.forward(this.crosshair.angle);
        this.mousepnt.x = x;
        this.mousepnt.y = y;
    },
    keydown: function(key) {

        if(key == 'SPACE') {
            if(!this.car.follows)
                this.car.follows = this.pilot.genGetFollowing();
        }
    },
    
    update: function() {
        this.world.step(1/60);
    }
});

game.createClass('Background', {
    width: 800,
    height: 800,
    follows: null,
    init: function(container) {
        this.tiles = new Array();
        for(var x = 0; x < 3; x++)
            for(var y = 0; y < 3; y++){
                var tile = new game.TilingSprite('grass_texture_4.jpg', this.width, this.height);
                tile.addTo(container);
                tile.position = new game.Vector(this.width * x, this.height * y);
                this.tiles.push(tile);
            }
    },
    update: function() {
        if(this.follows) {
            var point = this.follows();
            var middleTile = this.tiles[4];
            var tx = 0, ty = 0;
            if(point.x < middleTile.x)                  tx = -this.width;
            if(point.x > middleTile.x + this.width)     tx = this.width
            if(point.y < middleTile.y)                  ty = -this.height;
            if(point.y > middleTile.y + this.height)    ty = this.height;

            this.tiles.forEach(tile => {tile.x += tx; tile.y += ty});
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
        if(DBG_GRAPHICS)
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

    forward: function(angle) {
        if(!angle) angle = this.body.angle;
        this.follows = null;
        hyp = 2000;
        this.body.velocity = [0.0, 0.0];
        this.body.force = [0.0, 0.0];
        this.body.applyImpulse([  hyp * Math.sin(angle) ,  hyp * -Math.cos(angle)])
        this.body.angle = angle;
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
            return sprite.position;
        }
    }
});

game.createClass('Crosshair', {
    follows: null,
    angle: null,
    direction: Math.PI/38,
    view: 0,
    maxRange:  Math.PI/2,
    minRange: -Math.PI/2,

    init: function(trackQueue, container) {
        var shape = new game.Graphics();
        shape.fillColor = 'orange';
        shape.lineColor = 'yellow';
        shape.drawLine(0, 0, 0, -50);
        shape.drawCircle(0, -50, 6);
        shape.addTo(container);

        this.update = this.genOnUpdate(trackQueue, shape);
    },

    genOnUpdate: function(trackQueue, shape) {
        return function() {
            if(this.follows) {
                var target = this.follows();
                var pnt = trackQueue.currentSegment.bCurve.project(target);
                var nv  = trackQueue.currentSegment.bCurve.normal(pnt.t);
                var vec = new game.Vector(nv.x, nv.y);

                this.view += this.direction;
                if(this.view >= this.maxRange || this.view <= this.minRange)
                    this.direction *= -1;

                shape.rotation = vec.angle() + this.view;
                shape.position = target;

                this.angle = shape.rotation;
            }
        }
    }
});

game.createClass('Tracker', {
    follows: null,

    init: function(trackQueue, container) {
        this.update = this.genOnUpdate(trackQueue);

        var leftBox = new p2.Box({  width: 20 / game.scene.world.ratio, height: 300 / game.scene.world.ratio});
        this.leftBody = new p2.Body();
        this.leftBody.addShape(leftBox);
        game.scene.world.addBody(this.leftBody);

        var rightBox = new p2.Box({  width: 20 / game.scene.world.ratio, height: 300 / game.scene.world.ratio});
        this.rightBody = new p2.Body();
        this.rightBody.addShape(rightBox);
        game.scene.world.addBody(this.rightBody);

        var flattened = [];
        rightBox.vertices.forEach(x => { flattened.push(x[0] * game.scene.world.ratio, x[1] * game.scene.world.ratio)});
        this.rShape = new game.Graphics();
        this.rShape.fillColor = 'red';
        if(DBG_GRAPHICS)
            this.rShape.drawPolygon(flattened, false);
        this.rShape.addTo(container);

        var flattened = [];
        leftBox.vertices.forEach(x => { flattened.push(x[0] * game.scene.world.ratio, x[1] * game.scene.world.ratio)});
        this.lShape = new game.Graphics();
        this.lShape.fillColor = 'red';
        if(DBG_GRAPHICS)
            this.lShape.drawPolygon(flattened, false);
        this.lShape.addTo(container);
    },

    genOnUpdate: function(trackQueue) {
        return function() {
            if(this.follows) {
                var pnt = trackQueue.currentSegment.bCurve.project(this.follows());
                var nv  = trackQueue.currentSegment.bCurve.normal(pnt.t);
                var vec = new game.Vector(nv.x, nv.y);

                this.rShape.rotation = vec.angle();
                this.rShape.position = trackQueue.currentSegment.bCurve.offset(pnt.t, 100);

                this.lShape.rotation = vec.angle();
                this.lShape.position = trackQueue.currentSegment.bCurve.offset(pnt.t, -100);
            }
            this.rightBody.position[0] = this.rShape.x / game.scene.world.ratio;
            this.rightBody.position[1] = this.rShape.y / game.scene.world.ratio;
            this.rightBody.angle = this.rShape.rotation;
            
            this.leftBody.position[0] = this.lShape.x / game.scene.world.ratio;
            this.leftBody.position[1] = this.lShape.y / game.scene.world.ratio;
            this.leftBody.angle = this.lShape.rotation;
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
            trackQueue.currentSegment.curve.point(1.0, this.shape.position);
        }
    },

    genGetFollowing: function(){
        this.toNext();
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

        if(DBG_GRAPHICS)
            this.shape.drawCircle(0, 0, 10*this.size);

        this.shape.addTo(container);

        this.super(trackQueue, container, this.shape);
        this.onUpdate = this.genOnUpdate(trackQueue, this.shape);
        this.stop = this.genStop(trackQueue);
        
        this.body = new p2.Body({mass: 0});
        this.body.type = p2.Body.STATIC;
        this.body.collisionResponse = false;
        this.body.damping = 0;
        this.body.id = PILOT;
        var sensorShape = new p2.Circle({radius: 10 * this.size / game.scene.world.ratio});
        this.body.addShape(sensorShape);
        game.scene.world.addBody(this.body);

    },
    update: function() {
        this.body.position[0] = this.shape.x / this.body.world.ratio;
        this.body.position[1] = this.shape.y / this.body.world.ratio;
    },

    genStop: function(trackQueue)
    {
        return function() {
            if(this.tween.playing) {
                this.tween.stop();
                trackQueue.currentSegment.curve.point(1.0, this.shape.position);
            }
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
    bCurve:null,
    
    init: function(container, prevSegment) {
        this.container = container;
        if(prevSegment == null) {
            this.curve = this.startCurve();   
        } else {
            this.curve = this.continuingCurve(prevSegment);
        }
        this.bCurve = this.toBezier(this.curve);

        this.shape = new game.Graphics();
        //this.shape.alpha = 0.1;
        this.shape.lineWidth = this.width;
        this.shape.lineColor = 'blue';
        this.shape.drawCurve(this.curve);
        this.shape.lineWidth = this.width * 0.9;
        this.shape.lineColor = 'white';
        this.shape.drawCurve(this.curve);
        this.shape.addTo(this.container);
    },

    toBezier: function(curve) {
        return new Bezier(curve.start.x,      curve.start.y, 
                                curve.handle1.x,    curve.handle1.y, 
                                curve.handle2.x,    curve.handle2.y, 
                                curve.end.x,        curve.end.y);
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
