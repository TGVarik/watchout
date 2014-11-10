// start slingin' some d3 here.

var options = {
  height: 500,
  width: 500,
  padding: 20,
  enemies: 10,
  enemyRadius: 10,
  playerRadius: 15
};

var axes = {
  x: d3.scale.linear().domain([0,100]).range([0, options.width]).clamp(true),
  y: d3.scale.linear().domain([0,100]).range([0, options.height]).clamp(true)
};

var Player = function(opts) {
  this.gameOpts = opts;
  this.x = 0;
  this.y = 0;
  this.r = this.gameOpts.playerRadius;
};

Player.prototype.setX = function(newX) {
  var minX = this.gameOpts.padding;
  var maxX = this.gameOpts.width - this.gameOpts.padding;
  this.x = Math.min(Math.max(minX, newX), maxX);
};

Player.prototype.setY = function(newY){
  var minY = this.gameOpts.padding;
  var maxY = this.gameOpts.height - this.gameOpts.padding;
  this.y = Math.min(Math.max(minY, newY), maxY);
};

Player.prototype.transform = function(opts){
  this.setX(opts.x || this.x);
  this.setY(opts.y || this.y);
  this.el.attr('transform', 'translate(' + this.x + ',' + this.y +')');
};

Player.prototype.move = function(dx, dy){
  this.transform({
    x: this.x + dx,
    y: this.y + dy
  });
};

Player.prototype.setupDragging = function(){
  var dragMove = function(){
    this.move(d3.event.dx, d3.event.dy);
  }.bind(this);
  var drag = d3.behavior
      .drag()
      .on('drag', dragMove);
  this.el.call(drag);
};

Player.prototype.render = function(to) {
  this.el = to
      .append('circle')
      .attr('cx', this.x)
      .attr('cy', this.y)
      .attr('r', this.r)
      .attr('class', 'player');

  this.transform({
    x: this.gameOpts.width * 0.5,
    y: this.gameOpts.height * 0.5
  });
  this.setupDragging();
  return this;
};

var generateNewEnemyData = function(){
  return _.range(0, options.enemies).map(function(index){
    return {
      id: index,
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100)
    }
  });
};

var board = d3
    .select('body')
    .append('svg')
    .attr('height', options.height)
    .attr('width', options.width);

var player = new Player(options).render(board);

var tween = function(end_data) {
  var enemy = d3.select(this);
  var A = {x: parseFloat(enemy.attr('cx')), y: parseFloat(enemy.attr('cy'))};
  var B = {x: axes.x(end_data.x), y: axes.y(end_data.y)};

  return function (t) {
    var nextPosition = {
      x: A.x + (B.x - A.x) * t,
      y: A.y + (B.y - A.y) * t };
    enemy
        .attr('cx', nextPosition.x)
        .attr('cy', nextPosition.y);
  };
};

var reposition = function(newPosition, oldPosition) {
  var A = {x: oldPosition.x, y: oldPosition.y, r: options.enemyRadius};
  var B = {x: newPosition.x, y: newPosition.y, r: options.enemyRadius};
  var P = {x: player.x, y: player.y, r: player.r};

  var deltaX = B.x - A.x;
  var deltaY = B.y - A.y;
  var deltaR = B.r - A.r;

  var d = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

  var X = deltaX / d;
  var Y = deltaY / d;
  var R = deltaR / d;

  var right = {
    a: R * X - Y * Math.sqrt(1 - Math.pow(R, 2)),
    b: R * Y + X * Math.sqrt(1 - Math.pow(R, 2))
  };
  var left = {
    a: R * X + Y * Math.sqrt(1 - Math.pow(R, 2)),
    b: R * Y - X * Math.sqrt(1 - Math.pow(R, 2))
  };

  right.c = A.r - (right.a * A.x + right.b * A.y);
  left.c = A.r - (left.a * A.x + left.b * A.y);
  right.distance = Math.abs(right.a * P.x + right.b * P.y + right.c) / Math.sqrt(Math.pow(right.a, 2) + Math.pow(right.b, 2));
  left.distance = Math.abs(left.a * P.x + left.b * P.y + left.c) / Math.sqrt(Math.pow(left.a, 2) + Math.pow(left.b, 2));

  if (left.distance < P.r || right.distance < P.r) {

    console.log('collision!');
    //newPosition.x = Math.cos(theta) * (B.x - A.x) - Math.sin(theta) * (B.y - A.y) + A.x;
    //newPosition.y = Math.sin(theta) * (B.x - A.x) + Math.cos(theta) * (B.y - A.y) + A.y;
  }

};

var cycle = function(enemy_data) {

  var old_data = board.selectAll('.enemy').data();
  var link_data = [];
  for (var i = 0; i < old_data.length; i++){
    link_data[i] = {
      origin: {
        x: axes.x(old_data[i].x),
        y: axes.y(old_data[i].y)
      },
      destination: {
        x: axes.x(enemy_data[i].x),
        y: axes.y(enemy_data[i].y)
      },
      len: Math.abs(Math.sqrt(Math.pow(axes.x(enemy_data[i].x)-axes.x(old_data[i].x),2)+Math.pow(axes.y(enemy_data[i].y)-axes.y(old_data[i].y),2)))
    }
  }

  var destinations = board
      .selectAll('.destination')
      .data(enemy_data);

  destinations
      .exit()
      .remove();

  destinations
      .enter()
      .append('circle')
      .attr('class', 'destination')
      .attr('cx', function (d) {return d.x;})
      .attr('cy', function (d) {return d.y;})
      .attr('r', 2);

  var links = board
      .selectAll('.link')
      .data(link_data);

  links
      .enter()
      .append('line')
      .attr('class', 'link');

  links
      .attr('x1', function(d){return d.origin.x})
      .attr('y1', function(d){return d.origin.y})
      .attr('x2', function(d){return d.destination.x})
      .attr('y2', function(d){return d.destination.y})
      .attr('stroke-dasharray', function(d){return d.len + ' ' + d.len;})
      .attr('stroke-dashoffset', function(d){return d.len});

  links
      .transition()
      .duration(1000)
      .attr('stroke-dashoffset', 0)
      .attr('stroke-dasharray', function(d){})

  destinations
    .transition()
      .duration(1000)
      .tween('move', tween);

  /*for (var index = 0; index < old_data.length; index++) {
    reposition(enemy_data[index], old_data[index]);
  }

  destinations = board
      .selectAll('.destination')
      .data(enemy_data)
      .transition()
      .duration(200)
      .tween('move', tween);
*/
  var enemies = board
      .selectAll('.enemy')
      .data(enemy_data);

  enemies
      .exit()
      .remove();

  enemies
      .enter()
      .append('circle')
      .attr('class', 'enemy')
      .attr('cx', function (d) {return d.x;})
      .attr('cy', function (d) {return d.y;})
      .attr('r', 10)
      .transition()
      .duration(50)
      .attr('r', options.enemyRadius);

  enemies
      .transition()
      .duration(2000)
      .tween('move', tween);

  /*destinations
      .transition()
      .duration(5)
      .attr('r', 0);
*/
};

var play = function(){
  var tick = function() {
    // console.log('tick');
    newData = generateNewEnemyData();
    cycle(newData);
  };
  tick();
  setInterval(tick, 3200);

};

play();

/*

 collision avoidance

 enemy origin = A
 enemy destination = B
 player position = P
 player radius = r
 enemy radius = q

 player distance from trajectory:

 |(Bx-Ax)(Ay-Py) - (Ax-Px)(By-Ay)|
 -----------------------------------   = d
 √((Bx-Ax)^2 + (By-Ay)^2)

 if d < r+q, collision

 player distance from enemy origin:
 __
 √((Px-Ax)^2 + (Py-Ay)^2) = AP  = t

 u = ±√(t^2 - d^2)
 θ = cos^-1(t/u)
 ρ = sin^-1(d/t)
 φ = sin^-1(q/t)
 Θ = θ + ρ + φ

 Rotate B around A by Θ

 */

