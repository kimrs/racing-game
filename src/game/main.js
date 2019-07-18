game.module(
    'game.main'
)
.body(function() {

game.createScene('Main', {
    car: null,
    pilot: null,
    init: function() {
        var bg = new game.Graphics();
        bg.drawRect(0, 0, game.width, game.height);
        bg.addTo(this.stage);
        
        var container = new game.Container();
        container.addTo(this.stage);
        
        var bgContainer = new game.Container();
        bgContainer.addTo(container);
        track = new game.TrackSegment(bgContainer);
        track.addSegment();
        this.pilot = new game.Pilot(track);
        this.car = new game.Car(this.pilot);
        this.pilot.shape.swap(track.nextSegment.shape);
        
        camera = new game.GameCamera(container, this.car.shape);
    },
    update: function() {
        if(game.keyboard.down('A')) {
            this.pilot.tween.pause();
            camera.target = this.car.shape;
        }
        if(game.keyboard.down('B')) {
            this.pilot.tween.resume();
            camera.target = this.car.shape.parent;
        }
    }
});

game.createClass('GameCamera', {
    radius: 40,
    cameraSpeed: 400,
    toggleFollow: true,
    shape: null,
    target:null,
    camera: null,
    init: function(container, target) {
        this.target = target;
        var offset = this.radius/2;
        this.shape = new game.Graphics();
        this.shape.lineWidth = 2;
        this.shape.lineColor = 'red';
        this.shape.fillColor = null;
        this.shape.drawCircle(0, 0, this.radius);
        this.shape.drawLine(-this.radius -offset, 0,  -offset , 0);
        this.shape.drawLine(offset + this.radius, 0, offset , 0);
        this.shape.drawLine(0, -this.radius -offset, 0, -offset);
        this.shape.drawLine(0, this.radius +offset, 0, offset);
        this.shape.anchorCenter();
        this.shape.addTo(container);

        this.camera = new game.Camera(this.shape);
        this.camera.maxSpeed = this.cameraSpeed;
        this.camera.addTo(container);
    },

    update: function() {
        if (game.keyboard.down('SPACE')) this.toggleFollow = !this.toggleFollow; 
        
        if(this.toggleFollow && this.target) {
            hyp = this.target.y;
            angle = this.target.parent.rotation;
            pos = new game.Vector(  -hyp * Math.sin(angle) + this.target.parent.x,
                                     hyp * Math.cos(angle) + this.target.parent.y);
            
            this.shape.position.set(pos.x + this.radius, pos.y + this.radius);
            return;
        }

        if (game.keyboard.down('LEFT')) this.shape.x -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('RIGHT')) this.shape.x += this.cameraSpeed * game.delta;
        if (game.keyboard.down('UP')) this.shape.y -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('DOWN')) this.shape.y += this.cameraSpeed * game.delta;

    },
});

game.createClass('Car', {
    size: 30,
    shape: null,
    pilot: null,
    init: function(pilot) {
        this.pilot = pilot;
        this.shape = new game.Graphics();
        this.shape.fillColor = 'gray';
        this.shape.alpha = 0.5;
        this.shape.drawPolygon([-this.size, this.size*2, -this.size, this.size, 0, 0, this.size, this.size, this.size, this.size*2, -this.size, this.size*2]);
        pilot.shape.addChild(this.shape);
    },
    update: function() {
        if (game.keyboard.down('UP')) this.shape.y -= 400 * game.delta;
        if (game.keyboard.down('DOWN')) this.shape.y += 400 * game.delta;
        
    }
});

game.createClass('Pilot', {
    speed: 2000,
    shape: null,
    tween: null,
    size: 20,
    clearing: 30,
    moving: true,

    init: function(trackSegment) {
        tail = trackSegment;
        head = trackSegment;
        this.shape = new game.Graphics();
        this.shape.fillColor = 'green';
        this.shape.drawPolygon([-this.size, this.size, 0, 0, this.size, this.size, -this.size, this.size]);
        this.shape.addTo(trackSegment.container);
        shape = this.shape;
        moving = this.moving;
        clearing = this.clearing;
        prevPoint = trackSegment.curve.start;
        var props = {
            percent: 1 
        };


        var settings = {
            repeat: Infinity,
            yoyo: false,
            easing: 'Linear.None',
            onUpdate: function() {
                if(moving) {
                    var prevPoint = new game.Vector(this.position.x, this.position.y);
                    trackSegment.curve.point(this.percent, this.position);
                    shape.rotation = prevPoint.angle(this.position) + Math.PI/2;   
                }
            },
            onRepeat: function() {
                if(trackSegment.nextSegment){
                    trackSegment = trackSegment.nextSegment;
                    shape.swap(trackSegment.shape);
                }
    
                while(shape.position.distance(tail.curve.end) > clearing*tail.length) {
                    var disposed = tail;
                    tail = tail.nextSegment;
                    disposed.remove();
                }
                
                while(head.nextSegment)
                    head = head.nextSegment;
                
                while(shape.position.distance(head.curve.end) < clearing*head.length) {
                    head.addSegment();
                    head = head.nextSegment;
                }
            }
        };

        this.tween = game.Tween.add(this.shape, props, this.speed, settings);
        this.tween.start();
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
        this.shape.addTo(game.scene.stage);
        this.shape.drawCurve(this.curve);
        this.shape.lineWidth = this.width * 0.9;
        this.shape.lineColor = 'white';
        this.shape.drawCurve(this.curve);
        this.shape.addTo(this.container);
    },
    
    remove: function() {
        this.shape.remove();
    },
    
    addSegment: function() {
        var segment = this;
        while(segment.nextSegment)
            segment = segment.nextSegment;
        segment.nextSegment = new game.TrackSegment(this.container, segment);
    },
    
    addTo: function(container) {
        this.container = container;
        this.shape.addTo(container);
        this.sprite.addTo(container);   
    },
    
    startCurve: function() {
        length = this.length;
        var tail = new game.Vector(game.width / 2, game.height / 2);
        var head = tail.clone();
        head.move(length, -Math.PI / 2);
        var controlHandle = tail.clone();
       
        return new game.Curve(tail.x, tail.y, head.x, head.y,
            tail.x, tail.y, tail.x, tail.y);
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
