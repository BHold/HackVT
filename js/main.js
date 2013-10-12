var VTH = VTH || {};
VTH.vtMap = {};

VTH.init = function() {
  queue()
    .defer(d3.json, "vt.json")
    .defer(d3.csv, "data/housing_costs.csv")
    .await(VTH.vtMap.loadData);
};

VTH.vtMap.options = {
  'width': Math.floor($(window).width() * 0.40 * 0.75),
  'height': Math.floor($(window).height()),
  'colorRange': ["#fff7ec","#fee8c8","#fdd49e","#fdbb84","#fc8d59","#ef6548","#d7301f","#b30000","#7f0000"],
  'fields': ['mun_tax_rate2002', 'mun_tax_rate2003', 'mun_tax_rate2004'],
  'selectedField': 'mun_tax_rate2004'
};

VTH.vtMap.svg = d3.select(".vermont").append("svg")
  .attr("width", VTH.vtMap.options.width)
  .attr("height", VTH.vtMap.options.height);

VTH.vtMap.projection = d3.geo.transverseMercator()
  .rotate([72.57, -44.20])
  .translate([VTH.vtMap.options.width / 2, VTH.vtMap.options.height * 0.3])
  .scale([15000]);

VTH.vtMap.path = d3.geo.path()
  .projection(VTH.vtMap.projection);

VTH.vtMap.render = function() {
  var vt = VTH.vtMap.data;
  var field = VTH.vtMap.options.selectedField;
  var color = VTH.vtMap.getScale(field);

  VTH.vtMap.svg.selectAll(".town")
    .data(topojson.feature(vt, vt.objects.vt_towns).features)
   .enter().append("path")
    .attr("d", VTH.vtMap.path)
    .style("fill", function(d) {
      var stat = d.properties[field];

      if (stat) {
        return color(stat);
      } else {
        return "#ddd";
      }
    });
};

//VTH.vtMap.getY = function(domain) {
//  return d3.scale.linear()
//    .domain([0, Math.max(domain)])
//    .range([0, $(window).height() * 0.7]);
//};
//
//VTH.vtMap.getYAxis = function(domain) {
//  var y = VTH.vtMap.getY(domain)
//
//  return d3.svg.axis()
//    .scale(y)
//    .tickValues(color.domain())
//    .orient("right");
//};

VTH.vtMap.getDomain = function(field) {
  var domain = [];
  for (var i = 0; i < VTH.vtMap.data.objects.vt_towns.geometries.length; i++) {
    var value = VTH.vtMap.data.objects.vt_towns.geometries[i].properties[field];
    domain.push(value);
  }
  return domain;
};

VTH.vtMap.getScale = function(field) {
  return d3.scale.quantile()
    .domain(VTH.vtMap.getDomain(field))
    .range(VTH.vtMap.options.colorRange);
};

VTH.vtMap.loadData = function(error, vt, data) {
  for (var i = 0; i < data.length; i++) {
    var dataTown = data[i].town.toUpperCase();

    for (var j = 0; j < vt.objects.vt_towns.geometries.length; j++) {
      var jsonTown = vt.objects.vt_towns.geometries[j].properties.town.toUpperCase();
      if (dataTown === jsonTown) {
        for (var k = 0; k < VTH.vtMap.options.fields.length; k++) {
          var field = VTH.vtMap.options.fields[k];
          vt.objects.vt_towns.geometries[j].properties[field] = data[i][field];
        }
      }
    }
  }
  VTH.vtMap.data = vt;
  VTH.vtMap.render();
};

$(document).ready(function() {
  VTH.init();
});
