game.module(
    'game.main'
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
        this.world = new game.Physics(0, 0);
        
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
        this.car = new game.Car(spriteContainer);
        this.camera = new game.Camera();
        this.camera.addTo(bgContainer);
        this.camera.setTarget(this.pilot.shape);
    },
    
    update: function() {
        if(game.keyboard.down('SPACE')) {
            var hyp = Math.pow(this.track.currentSegment.curve.end.x - this.car.shape.x, 2) 
                    + Math.pow(this.track.currentSegment.curve.end.y - this.car.shape.y, 2);
            hyp = Math.sqrt(hyp);
            var percent = hyp / 800;
            
            this.pilot.moveToPercentage(1 - percent);
        }
        if(game.keyboard.down('W')) {
            this.pilot.tween.pause();
        }
        if(game.keyboard.down('S')) {
            this.pilot.tween.resume();
        }
        if(game.keyboard.down('UP')) {
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

game.Debug.updatePanel = function() {

    var track = game.scene.track.currentSegment.curve.end;
    //var track = game.scene.pilot.currentSegment;
    if(!track) return;
    this.text += ' trc: ' + track.x.toFixed(2) + ', ' + track.y.toFixed(2);
    /*
    var camera = game.scene.camera;
    if(!camera) return;
    this.text += ' cam: ' + camera.position.x.toFixed(2) + ', ' + camera.position.y.toFixed(2);
    */
    var car = game.scene.car.shape;
    if(!car) return;
    this.text += ' car: ' + car.x.toFixed(2) + ', ' + car.y.toFixed(2);
    var hyp = Math.pow(track.x - car.x, 2) + Math.pow(track.y - car.y, 2);
    hyp = Math.sqrt(hyp);
    hyp = hyp/800;
    hyp = 1 - hyp;
    this.text += ': ' + hyp.toFixed(2);
      
    var pilot = game.scene.track.currentSegment.curve;
    if (!pilot.shape) return;
    this.text += ' pil: ' + pilot.tween.props;
    //this.text  = ' pil: ' + pilot.shape.x.toFixed(2)s + ', ' + pilot.shape.y.toFixed(2);
};

game.createClass('Car', {
    size: 30,
    speed: 300,
    sprite: null,
    
    init: function(container) {
        this.sprite = new game.Sprite('media/car.png');
        this.sprite.anchor.set(24, 26);
        this.sprite.fillColor = 'gray';
        this.sprite.alpha = 0.5;
        container.addChild(this.sprite);
        
        this.shape = new game.Circle(this.sprite.width / 2);
        
        this.body = new game.Body();
        this.body.addShape(this.shape);
        this.body.addTo(game.scene.world);
        
        
        
    },
    
    forward: function() {
        hyp = 10;
        angle = this.shape.rotation;
        this.body.force = new game.Vector(0, -10);
        //this.body.position.x =  hyp * Math.sin(angle) + this.shape.x;
        //this.body.position.y = -hyp * Math.cos(angle) + this.shape.y;
    },
    turnLeft: function() {
        this.body.rotation -= Math.PI * game.delta;
    },
    turnRight: function() {
        this.body.rotation += Math.PI * game.delta;
    },

});

game.createClass('Pilot', {
    speed: 2000,
    size: 10,
    clearing: 30,
    shape: null,
    
    init: function(trackQueue, container, onEnterNextSegment) {
        this.shape = new game.Graphics();
        this.shape.fillColor = 'green';
        this.shape.drawCircle(this.size, this.size, this.size,  this.size);
        this.shape.drawCircle(this.size, -this.size/2, this.size/2,  this.size/2);
        this.shape.addTo(container);
        
        this.moveToPercentage = this.genMoveToPercentage(trackQueue, container);
        this.onRepeat = this.genOnRepeat(trackQueue, container, this.shape);
        this.onUpdate = this.genOnUpdate(trackQueue, this.shape);

        this.tween = this.genCurveTween(trackQueue, this.shape, container);
        this.tween.start();
        this.tween.pause();
    },
    
    
    genMoveToPercentage: function(trackQueue, container)
    {
        return function(percentage) {
            trackQueue.currentSegment.curve.point(percentage, this.shape.position);
            if(percentage >= 0.90) {
                trackQueue.moveToNext();
                container.swap(trackQueue.currentSegment.shape);
            }
        };
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
    
    genOnUpdate: function(trackQueue, shape) {
        return function() {
            var prevPoint = new game.Vector(this.position.x, this.position.y);
            trackQueue.currentSegment.curve.point(this.percent, this.position);
            shape.rotation = prevPoint.angle(this.position) + Math.PI/2;
        }
    },
    /*
    enteredNextSegment: function(thisPilot) {
        return function(nextSegment) {
            thisPilot.currentSegment = nextSegment;
        };
    },
    */
    getCurrentSegmentPos: function() {
        return this.currentSegment;  
    },
    
    
    genCurveTween: function(trackQueue, shape, container) {
        var props = {
            percent: 1 
        };
        
        this.settings = {
            repeat: Infinity,
            yoyo: false,
            easing: 'Linear.None',
        };
        
        var tween = game.Tween.add(this.shape, props, this.speed, this.settings);
        
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
        var controlHandle = tail.clone();
       
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
