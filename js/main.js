var VTH = VTH || {};
VTH.map = {};

VTH.init = function() {
  queue()
    .defer(d3.json, "vt.json")
    .await(VTH.map.render);
};

VTH.map.options = {
  'width': Math.floor($(window).width() * 0.40 * 0.75),
  'height': Math.floor($(window).height())
};

VTH.map.svg = d3.select(".vermont").append("svg")
  .attr("width", VTH.map.options.width)
  .attr("height", VTH.map.options.height);

VTH.map.projection = d3.geo.transverseMercator()
  .rotate([72.57, -44.20])
  .translate([VTH.map.options.width / 2, VTH.map.options.height * 0.3])
  .scale([15000]);

VTH.map.path = d3.geo.path()
  .projection(VTH.map.projection);

VTH.map.render = function(error, vt) {
  VTH.map.svg.selectAll(".town")
    .data(topojson.feature(vt, vt.objects.vt_towns).features)
   .enter().append("path")
    .attr("d", VTH.map.path)
    .style("fill", function(d) {
      return "#ddd";
    })
};

VTH.select_town = function(town) {
  var name = VTH.towns[town];
  var population = VTH.population[town];

  $('#town-name').text(name);
  $('#town-population').text(addCommas(population));
}

$(document).ready(function() {
  VTH.init();
});
