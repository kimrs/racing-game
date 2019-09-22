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
    init: function() {
        var bg = new game.Graphics();
        bg.drawRect(0, 0, game.width, game.height);
        bg.addTo(this.stage);
        
        var container = new game.Container();
        container.addTo(this.stage);
        
        var bgContainer = new game.Container();
        bgContainer.addTo(container);
        this.track = new game.TrackSegment(bgContainer);
        this.track.addSegment();
        
        this.pilot = new game.Pilot(this.track);
        this.pilot.shape.swap(this.track.nextSegment.shape);

        this.camera = new game.Camera();
        this.camera.addTo(bgContainer);
        this.camera.setTarget(this.pilot.shape);
    },
    update: function() {
        if(game.keyboard.down('W')) {
            this.pilot.tween.pause();
        }
        if(game.keyboard.down('S')) {
            this.pilot.tween.resume();
        }
        if(game.keyboard.down('UP')) {
            
        }
        
    }
});

game.Debug.updatePanel = function() {

    var pilot = game.scene.pilot.shape;
    if (!pilot) return;
    this.text  = ' pil: ' + pilot.x.toFixed(2) + ', ' + pilot.y.toFixed(2);
    
    
    var camera = game.scene.camera;
    if(!camera) return;
    this.text += ' cam: ' + camera.position.x.toFixed(2) + ', ' + camera.position.y.toFixed(2);
    this.text += ' sen: ' + camera.sensorPosition.x.toFixed(2) + ', ' + camera.sensorPosition.y.toFixed(2);
};


game.createClass('GameCamera', {
    radius: 40,
    cameraSpeed: 400,
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
        
        this.camera = new game.Camera(this.shape);
    },

    update: function() {
        if(!this.target)
            return;
      
        hyp = this.target.y;
        angle = this.target.parent.rotation;
        pos = new game.Vector(  -hyp * Math.sin(angle) + this.target.parent.x,
                                 hyp * Math.cos(angle) + this.target.parent.y);
        this.shape.position.set(pos.x + this.radius, pos.y + this.radius);
        return;
    },
});

game.createClass('Pilot', {
    speed: 2000,
    shape: null,
    tween: null,
    size: 10,
    clearing: 30,
    settings: null,
    
    init: function(trackSegment) {
        tail = trackSegment;
        head = trackSegment;
        this.shape = new game.Graphics();
        this.shape.fillColor = 'green';

        this.shape.drawCircle(this.size, this.size, this.size,  this.size);
        //this.shape.anchorCenter();
        this.shape.addTo(trackSegment.container);
        shape = this.shape;
        clearing = this.clearing;
        prevPoint = trackSegment.curve.start;

        this.tween = this.genCurveTween(trackSegment, shape);
        this.tween.start();
        tween = this.tween;
    },
    
    genCurveTween: function(trackSegment, shape) {
        var props = {
            percent: 1 
        };
        
        this.settings = {
            repeat: Infinity,
            yoyo: false,
            easing: 'Linear.None',
        };
        
        var tween = game.Tween.add(this.shape, props, this.speed, this.settings);
        
        tween.onUpdate(function() {
            var prevPoint = new game.Vector(this.position.x, this.position.y);
            trackSegment.curve.point(this.percent, this.position);
            shape.rotation = prevPoint.angle(this.position) + Math.PI/2;
        });
        
        tween.onRepeat(function() {
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
        });
        
        return tween;
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
    
    remove: function() {
        this.shape.remove();
    },
    
    addSegment: function() {
        var segment = this;
        while(segment.nextSegment) segment = segment.nextSegment;
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
