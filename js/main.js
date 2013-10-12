var VTH = VTH || {};
VTH.vtMap = {};

VTH.livability_weights = {};

VTH.init = function() {
  queue()
    .defer(d3.json, "vt.json")
    .defer(d3.csv, "data/livable.csv")
    .await(VTH.vtMap.loadData);

  VTH.vtMap.listenForCategoryClicks();
  VTH.init_menu();
};

VTH.vtMap.options = {
  'width': Math.floor($(window).width() * 0.40),
  'height': Math.floor($(window).height() - 100),
  'colorRange': ["#ffffe5","#f7fcb9","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#006837","#004529"],
  'fields': ['perc_bach_2000', 'avg_an_wage2010', 'perc_pop_consid_pov2000', 'med_gross_rent_perc_inc20072011', 'avg_commute_2000', 'mun_tax_rate2011', 'total_crime_per_1000', 'unemp_rate2012', 'education', 'income', 'poverty', 'housing', 'commute', 'crime', 'taxes', 'employment'],
  'selectedField': 'livability'
};

VTH.vtMap.svg = d3.select(".state").append("svg")
  .attr("width", VTH.vtMap.options.width)
  .attr("height", VTH.vtMap.options.height);

VTH.vtMap.projection = d3.geo.transverseMercator()
  .rotate([72.57, -44.20])
  .translate([VTH.vtMap.options.width / 2.2, VTH.vtMap.options.height * 0.4])
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
        .text(d.properties.town);

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
    })
    .on("click", function(d) {
      var town = slugify(d.properties.town);
      VTH.select_town(town);
    });

  VTH.vtMap.svg.append("path")
    .datum(topojson.feature(vt, vt.objects.lake))
    .attr("d", VTH.vtMap.path)
    .style("stroke", "#89b6ef")
    .style("stroke-width", "1px")
    .style("fill", "#b6d2f5");
};

//var y = d3.scale.sqrt()
//    .domain([0, 50000])
//    .range([0,325]);
//
//var yAxis = d3.svg.axis()
//    .scale(y)
//    .tickValues(color.domain())
//    .orient("right");

//VTH.vtMap.getY = function(domain) {
//  return d3.scale.linear()
//    .domain([Math.min(domain), Math.max(domain)])
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
  var included = [];

  for (var i = 0; i < data.length; i++) {
    var dataTown = data[i].town.toUpperCase();

    for (var j = 0; j < vt.objects.vt_towns.geometries.length; j++) {
      var jsonTown = vt.objects.vt_towns.geometries[j].properties.town.toUpperCase();
      if (dataTown === jsonTown) {
        included.push(jsonTown);
        for (var k = 0; k < VTH.vtMap.options.fields.length; k++) {
          var field = VTH.vtMap.options.fields[k];
          vt.objects.vt_towns.geometries[j].properties[field] = data[i][field];
        }
      }
    }
  }
  VTH.data = data;
  VTH.vtMap.data = vt;
  VTH.calculate_livability_weights();
  VTH.calculate_livability_scores();
  VTH.vtMap.render();

  var excludes = [];
  for (var i = 0; i < vt.objects.vt_towns.geometries.length; i++) {
    if (included.indexOf(vt.objects.vt_towns.geometries[i].properties.town.toUpperCase()) === -1) {
      excludes.push(vt.objects.vt_towns.geometries[i].properties.town);
    }
  }

  console.log(excludes);
};

VTH.vtMap.listenForCategoryClicks = function() {
  $(".menu").on('click', 'li', function() {
    var field = $(this).data('field');

    if (field) {
      VTH.vtMap.options.selectedField = field;
      VTH.vtMap.repaint();
    }
  });
};

VTH.vtMap.repaint = function() {
  var field = VTH.vtMap.options.selectedField;
  var color = VTH.vtMap.getScale(field);
  var vt = VTH.vtMap.data;

  VTH.vtMap.svg.selectAll(".town")
    .data(topojson.feature(vt, vt.objects.vt_towns).features)
    .style("fill", function(d) {
      var stat = d.properties[field];

      if (stat) {
        return color(stat);
      } else {
        return "#ddd";
      }
    });
};

VTH.select_town = function(town) {
  var name = VTH.towns[town];
  var population = VTH.population[town];
  var image;
  if (typeof VTH.images[town] !== 'undefined') {
    image = VTH.images[town][0];
  } else {
    var random = Math.round(Math.random() * Object.keys(VTH.images).length);
    var town = Object.keys(VTH.images)[random];
    image = VTH.images[town][0];
  }

  $('#town-name').text(name);
  $('#town-population').text(addCommas(population));
  $('.info header').css('background-image', 'url('+image+')');
};

VTH.affordability_chart = function(town) {
};

VTH.init_menu = function() {
  var indicators = $('.menu li')
      inputs = indicators.find('input');

  inputs.click(function(e) {
    e.stopPropagation();
  });

  indicators.click(function() {
    indicators.removeClass('active');
    $(this).addClass('active');

    if ( $(this).data('indicator') == 'livability' ) {
      indicators.removeClass('no-input');
      indicators.find('input').fadeIn();
    } else {
      indicators.addClass('no-input');
      indicators.find('input').fadeOut();
    }
  });

  inputs.change(function() {
    VTH.calculate_livability_weights();
    VTH.calculate_livability_scores();
    VTH.vtMap.repaint();
  });
};

VTH.calculate_livability_weights = function() {
  var indicators = $('.menu li')
      inputs = indicators.find('input'),
      total = 0;

  inputs.each(function(k, v) {
    var indicator = $(v).closest('li').data('indicator'),
        weight = $(v).val() / 100;
    VTH.livability_weights[indicator] = weight;
    total += weight;
  });

  VTH.livability_weights['total'] = total;
}

VTH.calculate_livability_scores = function() {
  var features = VTH.vtMap.data.objects.vt_towns.geometries,
      indicators = Object.keys(VTH.livability_weights),
      indicator_total;

  $.each(features, function(k, feature) {
    indicator_total = 0;
    $.each(indicators, function(k, indicator) {
      if ( indicator == 'total' ) {
        return false;
      }
      indicator_total += feature.properties[indicator] * VTH.livability_weights[indicator];
    });
    feature.properties['livability'] = indicator_total / VTH.livability_weights['total'];
  });
}

$(document).ready(function() {
  VTH.init();
});
