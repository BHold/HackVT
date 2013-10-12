var VTH = VTH || {};
VTH.vtMap = {};

VTH.init = function() {
  queue()
    .defer(d3.json, "vt.json")
    .defer(d3.csv, "data/liveable.csv")
    .await(VTH.vtMap.loadData);
};

VTH.vtMap.options = {
  'width': Math.floor($(window).width() * 0.40 * 0.75),
  'height': Math.floor($(window).height()),
  'colorRange': ["#ffffe5","#f7fcb9","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#006837","#004529"],
  'fields': ['med_gross_rent20072011', 'avg_wage2010'],
  'selectedField': 'avg_wage2010'
};

VTH.vtMap.svg = d3.select(".state").append("svg")
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
    .attr("class", "town")
    .style("fill", function(d) {
      var stat = d.properties[field];

      if (stat) {
        return color(stat);
      } else {
        return "#ddd";
      }
    })
    .on("mouseover", function(d) {
      var xPosition = d3.mouse(this)[0];
      var yPosition = d3.mouse(this)[1] - 30;

      VTH.vtMap.svg.append("text")
        .attr("id", "tooltip")
        .attr("x", xPosition)
        .attr("y", yPosition)
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", "black")
        .text(d.properties.town + ', ' + d.properties[field]);

      d3.select(this)
        .style("fill", "#ef6548");
    })
    .on("mouseout", function(d) {
      d3.select("#tooltip").remove();

      d3.select(this)
        .transition()
        .duration(250)
        .style("fill", function(d) {
          var stat = d.properties[field];

          if (stat) {
            return color(stat);
          } else {
            return "#ddd";
          }
        });
    });

  VTH.vtMap.svg.append("path")
    .datum(topojson.feature(vt, vt.objects.lake))
    .attr("d", VTH.vtMap.path)
    .style("stroke", "#89b6ef")
    .style("stroke-width", "1px")
    .style("fill", "#b6d2f5");
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

VTH.select_town = function(town) {
  var name = VTH.towns[town];
  var population = VTH.population[town];

  $('#town-name').text(name);
  $('#town-population').text(addCommas(population));
}

$(document).ready(function() {
  VTH.init();
});
