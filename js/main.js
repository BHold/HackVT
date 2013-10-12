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
  'fields': ['education', 'income', 'poverty', 'housing', 'commute', 'crime', 'taxes', 'employment', 'percent_fem', 'perc_und_18_2000', 'perc_over_65_2000'],
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
  VTH.vtMap.currentScale = VTH.vtMap.getScale(field);

  VTH.vtMap.svg.selectAll(".town")
    .data(topojson.feature(vt, vt.objects.vt_towns).features)
   .enter().append("path")
    .attr("d", VTH.vtMap.path)
    .attr("class", "town")
    .style("fill", function(d) {
      var stat = d.properties[field];

      if (stat) {
        return VTH.vtMap.currentScale(stat);
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
        .style("fill", function() {
          var stat = d.properties[VTH.vtMap.options.selectedField];
          if (stat) {
            return VTH.vtMap.currentScale(stat);
          } else {
            return "#ddd";
          }
        });
    })
    .on("click", function(d) {
      var town = slugify(d.properties.town);
      VTH.select_town(town);
    });

  VTH.vtMap.getStat = function(properties) {
    return properties[VTH.vtMap.options.selectedField];
  };

  VTH.vtMap.svg.append("path")
    .datum(topojson.feature(vt, vt.objects.lake))
    .attr("d", VTH.vtMap.path)
    .style("stroke", "#89b6ef")
    .style("stroke-width", "1px")
    .style("fill", "#b6d2f5");
};

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
  VTH.data = data;
  VTH.vtMap.data = vt;
  VTH.calculate_livability_weights();
  VTH.calculate_livability_scores();
  VTH.vtMap.render();
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
  VTH.vtMap.currentScale = VTH.vtMap.getScale(field);
  var vt = VTH.vtMap.data;

  VTH.vtMap.svg.selectAll(".town")
    .data(topojson.feature(vt, vt.objects.vt_towns).features)
    .style("fill", function(d) {
      var stat = d.properties[VTH.vtMap.options.selectedField];
      if (stat) {
        return VTH.vtMap.currentScale(stat);
      } else {
        return "#ddd";
      }
    });
};

VTH.select_town = function(town) {
  var name = VTH.towns[town];
  var image;
  if (typeof VTH.images[town] !== 'undefined') {
    image = VTH.images[town][0];
  } else {
    var random = Math.round(Math.random() * Object.keys(VTH.images).length);
    var town = Object.keys(VTH.images)[random];
    image = VTH.images[town][0];
  }

  VTH.currentTown = town;
  VTH.updateLivabilityText(town);
  VTH.drawPieChart();

  $('#town-name').text(name);
  $('.info header').css('background-image', 'url('+image+')');
};

VTH.updateLivabilityText = function(town) {
  for (var i = 0; i < VTH.vtMap.data.objects.vt_towns.geometries.length; i++) {
    var props = VTH.vtMap.data.objects.vt_towns.geometries[i].properties;
    if (props.town.toUpperCase() === town.toUpperCase()) {
      var value = props['livability'];
      var cleanedValue = Math.floor(value * 100);
      $("#town-livability").text(cleanedValue);
      break;
    }
  }
};

VTH.affordability_chart = function(town) {
};

VTH.init_menu = function() {
  var indicators = $('.menu li')
      inputs = indicators.find('input'),
      title = $('.state h3'),
      source = $('.state h4');

  indicators.click(function() {
    indicators.removeClass('active');
    $(this).addClass('active');

    if ( $(this).data('field') == 'livability' ) {
      indicators.removeClass('no-input');
      indicators.find('input').fadeIn();
    } else {
      indicators.addClass('no-input');
      indicators.find('input').fadeOut();
    }

    title.text($(this).data('title'));
    source.text($(this).data('source'));
  });

  inputs.click(function(e) {
    e.stopPropagation();
  }).change(function() {
    VTH.calculate_livability_weights();
    VTH.calculate_livability_scores();
    VTH.vtMap.repaint();
    VTH.updateLivabilityText(VTH.currentTown);
  });
};

VTH.calculate_livability_weights = function() {
  var indicators = $('.menu li')
      inputs = indicators.find('input'),
      total = 0;

  inputs.each(function(k, v) {
    var indicator = $(v).closest('li').data('field'),
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
    indicator_total = 0.0001;
    $.each(indicators, function(k, indicator) {
      if ( indicator == 'total' ) {
        return false;
      }
      indicator_total += feature.properties[indicator] * VTH.livability_weights[indicator];
    });
    feature.properties['livability'] = indicator_total / VTH.livability_weights['total'];
  });
};

VTH.drawPieChart = function() {
  if ($('.age').length || $('.gender').length) {
    $(".pie-cont").empty();
  }

  var width = $(window).width() * .13,
    height = width,
    radius = width / 2;

  var arc = d3.svg.arc()
      .outerRadius(radius - 10)
      .innerRadius(0);

  var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d.value; });

  var svgGender = d3.select(".pie-cont").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "gender")
      .style("margin-right", "30px")
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var svgAge = d3.select(".pie-cont").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "age")
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var pieData = VTH.getPieData();
  var genderData = pieData.genderData;
  var ageData = pieData.ageData;

  var g = svgGender.selectAll(".arc")
      .data(pie(genderData))
    .enter().append("g")
      .attr("class", "arc")
      .attr("class", "genderSVG");

  g.append("path")
      .attr("d", arc)
      .style("fill", function(d) { if (d.data.label === 'Females') {return '#F4C2DB';} else { return '#89CFF0';} });

  g.append("text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .text(function(d) { return d.data.label; });

  var g2 = svgAge.selectAll(".arc")
      .data(pie(ageData))
    .enter().append("g")
      .attr("class", "arc")
      .attr("class", "ageSVG");
  g2.append("path")
      .attr("d", arc)
      .style("fill", function(d) { if (d.data.label === '<18') {return '#fde0dd';} else if (d.data.label === '>65') {return '#fa9fb5';} else { return '#c51b8a';} });

  g2.append("text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .text(function(d) { return d.data.label; });
};

VTH.getPieData = function() {
  var genderData;
  var ageData;

  for (var i = 0; i < VTH.vtMap.data.objects.vt_towns.geometries.length; i++) {
    var props = VTH.vtMap.data.objects.vt_towns.geometries[i].properties;

    if (props.town.toUpperCase() === VTH.currentTown.toUpperCase()) {
      var under18 = Math.floor(parseInt(props.perc_und_18_2000, 10));
      var over65 = Math.floor(parseInt(props.perc_over_65_2000, 10));

      genderData = [
        {
          'value': Math.floor(parseInt(props.percent_fem, 10)),
          'label': 'Females'
        },
        {
          'value': Math.floor(100 - parseInt(props.percent_fem, 10)),
          'label': 'Males'
        }
      ];
      ageData = [
        {
          'value': under18,
          'label': '<18'
        },
        {
          'value': over65,
          'label': '>65'
        },
        {
          'value': 100 - over65 - under18,
          'label': '18-65'
        }
      ];
      break;
    }
  }

  return {
    'genderData': genderData,
    'ageData': ageData
  };
};

$(document).ready(function() {
  VTH.init();
});
