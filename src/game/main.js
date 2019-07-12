game.module(
    'game.main'
)
.body(function() {
    

game.createScene('Main', {
    track: null,

    init: function() {
        this.track = new game.TrackSegment();
        pilot = new game.Pilot(this.track);
        
        for(i = 0; i < 100; i++ ) 
            this.track = new game.TrackSegment(this.track);
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

game.createClass('Pilot', {
    trackSegment: null,
    
    init: function(trackSegment) {
        this.trackSegment = trackSegment;
        var grap = this.grap;
        grap = new game.Graphics();
        grap.drawCircle(0, 0, 5);
        grap.addTo(game.scene.stage);
        
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

        var tween = game.Tween.add(grap, props, 500, settings);
        tween.start();
    }
});


game.createClass('TrackSegment', {
    curve: null,
    prevSegment: null,
    nextSegment: null,
    length: 20,
    curvature: Math.PI / 2,
    turnAngle: Math.PI /2,
    
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
    },
    
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
