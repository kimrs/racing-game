game.module(
    'game.main'
)
.body(function() {
    

game.createScene('Main', {
    track: null,

    init: function() {
        var container = new game.Container();
        container.addTo(this.stage);
        this.track = new game.TrackSegment();
        this.track.addTo(container);
        pilot = new game.Pilot(this.track);

        for(i = 0; i < 500; i++ ) 
            this.track = new game.TrackSegment(this.track);
            
        camera = new game.GameCamera(container, this.stage);
        camera.pilot = pilot;
    },
    
    mousemove: function(x, y) {
        if (!this.activeHandle) return;
        
        this.activeHandle.grap.position.set(x, y);
        this.activeHandle.target.set(x, y);
    },
    
    mouseup: function() {
        this.activeHandle = null;
    },
    
    mousedown: function() {
        var i;
        for(i = 0; i < 10; i++ ) 
            this.track = new game.TrackSegment(this.track);
    }
    
});
game.createClass('GameCamera', {
    radius: 40,
    cameraSpeed: 200,
    toggleFollow: false,
    shape: null,
    pilot:null,
    init: function(container, stage) {
        this.shape = new game.Graphics();
        this.shape.lineWidth = 2;
        this.shape.lineColor = 'red';
        this.shape.fillColor = null;
        var offset = this.radius/2;
        this.shape.drawCircle(0, 0, this.radius);
        this.shape.drawLine(-this.radius -offset, 0,  -offset , 0);
        this.shape.drawLine(offset + this.radius, 0, offset , 0);
        this.shape.drawLine(0, -this.radius -offset, 0, -offset);
        this.shape.drawLine(0, this.radius +offset, 0, offset);
        this.shape.anchorCenter();
        this.shape.center(stage);
        this.shape.addTo(container);

        var camera = new game.Camera(this.shape);
        camera.addTo(container);
    },
    
    update: function() {
        if (game.keyboard.down('SPACE')) this.toggleFollow = !this.toggleFollow; 
        
        if(this.toggleFollow && this.pilot) {
            this.shape.x = pilot.shape.x + this.radius;
            this.shape.y = pilot.shape.y + this.radius;
            return;
        }

        if (game.keyboard.down('LEFT')) this.shape.x -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('RIGHT')) this.shape.x += this.cameraSpeed * game.delta;
        if (game.keyboard.down('UP')) this.shape.y -= this.cameraSpeed * game.delta;
        if (game.keyboard.down('DOWN')) this.shape.y += this.cameraSpeed * game.delta;
        
    },
});
game.createClass('Pilot', {
    shape: null,
    init: function(trackSegment) {
        this.shape = new game.Graphics();
        this.shape.drawCircle(0, 0, 5);
        this.shape.addTo(game.scene.stage);
        this.shape.addTo(trackSegment.container);
        
        var props = {
            percent: 1 
        };

        var settings = {
            repeat: Infinity,
            yoyo: false,
            easing: 'Linear.None',
            onUpdate: function() {
                trackSegment.curve.point(this.percent, this.position);
            },
            onRepeat: function() {
                trackSegment = trackSegment.nextSegment;
            }
        };

        var tween = game.Tween.add(this.shape, props, 500, settings);
        tween.start();
    }
});


game.createClass('TrackSegment', {
    length: 20,
    curvature: Math.PI,
    turnAngle: Math.PI/2,
    curve: null,
    prevSegment: null,
    nextSegment: null,
    container: null,
    grap: null,
    
    init: function(prevSegment) {
        if(prevSegment == null) {
            this.curve = this.startCurve();   
        } else {
            this.curve = this.continuingCurve(prevSegment);
        }
        this.grap = new game.Graphics();
        this.grap.lineWidth = 2;
        this.grap.drawCurve(this.curve);
        this.grap.addTo(game.scene.stage);
        if(this.container)
            this.grap.addTo(this.container);
            
    },
    
    addTo: function(container) {
        this.container = container;
        this.grap.addTo(container);
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
        
        var startHandle = new game.Handle(curve.start, 'red');
        var controlHandle = new game.Handle(curve.handle1, 'red', 0.5);
        var endHandle = new game.Handle(curve.end, 'blue');
        var control2Handle = new game.Handle(curve.handle2, 'blue', 0.5);
        prevSegment.nextSegment = this;
        return curve;
    }
});

game.createClass('Handle', {
    init: function(target, color, alpha) {
        if(false)
        {
            this.target = target;
            this.grap = new game.Graphics();
            this.grap.position.copy(target);
            this.grap.fillColor = color;
            this.grap.drawCircle(5, 5, 5);
            this.grap.alpha = alpha || 1;
            this.grap.anchorCenter();
            this.grap.interactive = true;
            this.grap.mousedown = this.mousedown.bind(this);
            this.grap.addTo(game.scene.stage);
        }

    },
    
    mousedown: function() {
        game.scene.activeHandle = this;
    }
});


});
