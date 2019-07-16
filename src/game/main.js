game.module(
    'game.main'
)
.body(function() {

game.createScene('Main', {
    track: null,
    camera: null,

    init: function() {
        game.Debug = true;
        var bg = new game.Graphics();
        bg.drawRect(0, 0, game.width, game.height - 100);
        bg.addTo(this.stage);
        
        var container = new game.Container();
        container.addTo(this.stage);
        
        var bgContainer = new game.Container();
        bgContainer.addTo(container);
        this.track = new game.TrackSegment(bgContainer);
        this.track.addSegment();
        pilot = new game.Pilot(this.track);
        pilot.shape.swap(this.track.nextSegment.shape);
        
        var uiContainer = new game.Container();
        bgContainer.addChild(uiContainer);
        //uiContainer.addTo(bgContainer);
        
        this.camera = new game.GameCamera(uiContainer, pilot);
    }
    
});

game.createClass('GameCamera', {
    radius: 40,
    cameraSpeed: 400,
    toggleFollow: false,
    shape: null,
    pilot:null,
    container: null,
    camera: null,
    cameraDrawOrder: 3,
    init: function(container, pilot) {
        this.pilot = pilot;
        this.container = container;
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
        
        this.camera.addTo(container);
    },
    
    update: function() {
        
        var pilotShapePosition =  this.pilot.shape.position;
        
        game.Debug.Text = "campos: " + this.camera;
        if (game.keyboard.down('SPACE')) this.toggleFollow = !this.toggleFollow; 
        
        if(this.toggleFollow && this.pilot) {
            this.shape.position.set(pilot.shape.x + this.radius, pilot.shape.y + this.radius);
            return;
        }

        if (game.keyboard.down('LEFT')) this.shape.x -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('RIGHT')) this.shape.x += this.cameraSpeed * game.delta;
        if (game.keyboard.down('UP')) this.shape.y -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('DOWN')) this.shape.y += this.cameraSpeed * game.delta;

    },
});
game.createClass('Pilot', {
    speed: 2000,
    shape: null,
    size: 20,
    clearing: 30,

    init: function(trackSegment) {
        tail = trackSegment;
        head = trackSegment;
        this.shape = new game.Graphics();
        this.shape.fillColor = 'green';
        this.shape.drawPolygon([-this.size, this.size, 0, 0, this.size, this.size, -this.size, this.size]);
        this.shape.addTo(game.scene.stage);
        this.shape.addTo(trackSegment.container);
        
        shape = this.shape;
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
                var prevPoint = new game.Vector(this.position.x, this.position.y);
                trackSegment.curve.point(this.percent, this.position);
                shape.rotation = prevPoint.angle(this.position) + Math.PI/2;
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

        var tween = game.Tween.add(this.shape, props, this.speed, settings);
        tween.start();
    }
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
    sprite: null,
    
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
        if(this.shape)
            this.shape.remove();
        if(this.sprite)
            this.sprite.remove();
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
