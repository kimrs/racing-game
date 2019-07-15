game.module(
    'game.main'
)
.body(function() {

game.createScene('Main', {
    track: null,

    init: function() {
        var bg = new game.Graphics();
        bg.drawRect(0, 0, game.width, game.height);
        bg.addTo(this.stage);
        
        var container = new game.Container();
        container.addTo(this.stage);
        this.track = new game.TrackSegment(container);
        this.track.addSegment();
        pilot = new game.Pilot(this.track);
        camera = new game.GameCamera(container, pilot);
    }
    
});

game.createClass('GameCamera', {
    radius: 40,
    cameraSpeed: 400,
    toggleFollow: true,
    shape: null,
    pilot:null,
    container: null,
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

        var camera = new game.Camera(this.shape);
        camera.addTo(container);
    },
    
    update: function() {
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
                    shape.swap(trackSegment.grap);
                    
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
    grap: null,
    sprite: null,
    
    init: function(container, prevSegment) {
        this.container = container;
        if(prevSegment == null) {
            this.curve = this.startCurve();   
        } else {
            this.curve = this.continuingCurve(prevSegment);
        }
        this.grap = new game.Graphics();
        this.grap.lineWidth = this.width;
        this.grap.lineColor = 'blue';
        this.grap.addTo(game.scene.stage);
        this.grap.drawCurve(this.curve);
        this.grap.lineWidth = this.width * 0.9;
        this.grap.lineColor = 'white';
        this.grap.drawCurve(this.curve);
        this.grap.addTo(this.container);
    },
    
    remove: function() {
        if(this.grap)
            this.grap.remove();
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
        this.grap.addTo(container);
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
