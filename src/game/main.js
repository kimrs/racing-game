game.module(
    'game.main'
)
.body(function() {
    

game.createScene('Main', {
    length: 150,
    curvature: Math.PI,
    turnAngle: Math.PI,

    init: function() {
        length = this.length;

        var trackSegment1 = new game.TrackSegment(null);
        var trackSegment2 = new game.TrackSegment(trackSegment1);
        var trackSegment3 = new game.TrackSegment(trackSegment1);
        var trackSegment4 = new game.TrackSegment(trackSegment1);
        
        var trackSegment5 = new game.TrackSegment(trackSegment2);
        var trackSegment6 = new game.TrackSegment(trackSegment2);
        var trackSegment7 = new game.TrackSegment(trackSegment2);
        
        var trackSegment8 = new game.TrackSegment(trackSegment3);
        var trackSegment9 = new game.TrackSegment(trackSegment3);
        var trackSegment10 = new game.TrackSegment(trackSegment3);
        
        var trackSegment11 = new game.TrackSegment(trackSegment4);
        var trackSegment12 = new game.TrackSegment(trackSegment4);
        var trackSegment13 = new game.TrackSegment(trackSegment4);
    },
    
    mousemove: function(x, y) {
        if (!this.activeHandle) return;
        
        this.activeHandle.grap.position.set(x, y);
        this.activeHandle.target.set(x, y);
    },
    
    mouseup: function() {
        this.activeHandle = null;
    }
});

game.createClass('TrackSegment', {
    curve: null,
    prevSegment: null,
    length: 150,
    curvature: Math.PI,
    turnAngle: Math.PI,
    
    startCurve: function() {
        length = this.length;
        var tail = new game.Vector(game.width / 2, game.height - length);
        var head = tail.clone();
        head.move(length, -Math.PI / 2);
        var controlHandle = tail.clone();
       
        return new game.Curve(tail.x, tail.y, head.x, head.y,
            tail.x, tail.y, tail.x, tail.y);
    },
    
    init: function(prevSegment) {
        if(prevSegment == null) {
            this.curve = this.startCurve();   
        } else {
            this.prevSegment = prevSegment;
            var length = this.length;
            var direction = (this.prevSegment.curve.start.angle(this.prevSegment.curve.end) - this.turnAngle / 2) + (Math.random() * this.turnAngle);
            var head = this.prevSegment.curve.end.clone();
            head.move(length, direction);
            
            var controlHandle = head.clone();
            var controlAngle = (head.angle(this.prevSegment.curve.end) - this.curvature/2) + (Math.random() * this.curvature);
            controlHandle.move(length / 2, controlAngle);
            
            var startHandle = this.prevSegment.curve.handle2.clone();
            var angle = this.prevSegment.curve.handle2.angle(this.prevSegment.curve.end);
            var distance = this.prevSegment.curve.handle2.distance(this.prevSegment.curve.end);
            startHandle.move(distance * 2, angle);
           
            var curve = new game.Curve(this.prevSegment.curve.end.x, this.prevSegment.curve.end.y, head.x, head.y, 
            startHandle.x, startHandle.y, controlHandle.x, controlHandle.y);
            
            var startHandle = new game.Handle(curve.start, 'red');
            var controlHandle = new game.Handle(curve.handle1, 'red', 0.5);
            var endHandle = new game.Handle(curve.end, 'blue');
            var control2Handle = new game.Handle(curve.handle2, 'blue', 0.5);
            this.curve = curve;
        }
        this.grap = new game.Graphics();
        this.grap.lineWidth = 2;
        this.grap.drawCurve(this.curve);
        this.grap.addTo(game.scene.stage);
    }
});

game.createClass('Handle', {
    init: function(target, color, alpha) {
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
    },
    
    mousedown: function() {
        game.scene.activeHandle = this;
    }
});


});
