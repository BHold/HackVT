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
  'fields': ['education', 'income', 'poverty', 'housing', 'commute', 'crime', 'taxes', 'employment'],
  'selectedField': 'livability'
};

VTH.vtMap.svg = d3.select(".state").append("svg")
  .attr("width", VTH.vtMap.options.width)
  .attr("height", VTH.vtMap.options.height);

VTH.vtMap.projection = d3.geo.transverseMercator()
  .rotate([72.57, -44.20])
  .translate([VTH.vtMap.options.width / 2.2, VTH.vtMap.options.height * 0.43])
  .scale([16500]);

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

  VTH.initLineGraph();
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

  $('#town-name').text(name);
  $('.info header').css('background-image', 'url('+image+')');
<<<<<<< HEAD
  VTH.updateLineGraph();
=======
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
>>>>>>> 6d02cbdf8568f8f6913b1271f2f5d64ec9b5c6a3
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
}

VTH.initLineGraph = function() {
    var m = [0, 0, 0, 0]; // margins
    var w = Math.floor($(window).width() * 0.40) - 20 - m[1] - m[3]; // width
    var h = 200 - m[0] - m[2]; // height

    VTH.graph = d3.select("#affordability-chart").append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2])
        .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    VTH.graph.w = w;
    VTH.graph.m = m;
    VTH.graph.h = h;

}

VTH.updateLineGraph = function() {
    $('#affordability-chart').css('display', 'block');

    // create a simple data array that we'll plot with a line (this array represents only the Y values, X will just be the index location)
    var data = [23011.14, 23444.39,	25297.25, 26018.98, 26391.53, 26279.06, 27354.20, 29421.18,	31036.08, 33925.49,	34161.88, 36642.35,	36320.16, 38330.35];

    // X scale will fit all values from data[] within pixels 0-w
    var x = d3.scale.linear().domain([0, data.length]).range([0, VTH.graph.w]);
    // Y scale will fit values from 0-10 within pixels h-0 (Note the inverted domain for the y-scale: bigger is up!)
    var y = d3.scale.linear().domain([0, 40000]).range([VTH.graph.h, 0]);
        // automatically determining max range can work something like this
        // var y = d3.scale.linear().domain([0, d3.max(data)]).range([h, 0]);

    // create a line function that can convert data[] into x and y points
    var line = d3.svg.line()
        // assign the X function to plot our line as we wish
        .x(function(d,i) { 
            // verbose logging to show what's actually being done
            console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
            // return the X coordinate where we want to plot this datapoint
            return x(i); 
        })
        .y(function(d) { 
            // verbose logging to show what's actually being done
            console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
            // return the Y coordinate where we want to plot this datapoint
            return y(d); 
        })

        // Add an SVG element with the desired dimensions and margin.
        // create yAxis
        var xAxis = d3.svg.axis().scale(x).tickSize(-VTH.graph.h).tickSubdivide(true);
        // Add the x-axis.
        VTH.graph.append("svg:g")
                .attr("class", "x axis")
                .attr("transform", "translate(5," + VTH.graph.h - 50 + ")")
                .call(xAxis);


        // create left yAxis
        var yAxisLeft = d3.svg.axis().scale(y).ticks(4).orient("left");
        // Add the y-axis to the left
        VTH.graph.append("svg:g")
                .attr("class", "y axis")
                .attr("transform", "translate(-25,0)")
                .call(yAxisLeft);
        
        // Add the line by appending an svg:path element with the data line we created above
        // do this AFTER the axes above so that the line is above the tick-lines
        VTH.graph.append("svg:path").attr("d", line(data));
}


$(document).ready(function() {
  VTH.init();
});
