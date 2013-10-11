//@codekit-prepend "d3.v3.min.js"
//@codekit-prepend "queue.v1.min.js"
//@codekit-prepend "topojson.v1.min.js"

$('#myTab a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
});

if ($(window).width() < 768) {
    var scale = [9000],
        translate = [150, 160],
        symbolRange = [0, 40],
        legendRange = [0, 230],
        fhaKey = "(240, 135)",
        rKey = "(270, 105)",
        xLegend = 210,
        yLegend = 350,
        width = 350,
        height = 450,
        symbolText = 55,
        xCircle = 60,
        yCircle = 410,
        circleRadius = 45;
} else {
    var scale = [12000],
        translate = [175, 190],
        symbolRange = [0, 50],
        legendRange = [0, 325],
        fhaKey = "(320, 135)",
        rKey = "(320, 165)",
        width = 460,
        height = 600,
        xLegend = 260,
        yLegend = 435,
        symbolText = 65,
        xCircle = 80,
        yCircle = 520,
        circleRadius = 60;
}

if (Modernizr.touch) {
        touchClick="mouseover";
    } else {
        touchClick="click";
    }

var width = width;

var radius = d3.scale.sqrt()
    .domain([0, 1.3e6])
    .range([0, circleRadius]);

var townInfo = d3.select("div#vcf-town-info");
var mainInfo = d3.select("div#vcf-info-main");
var countyInfo = d3.select("div#vcf-county-info");
var resetData = d3.selectAll("p.vcf-reset");

resetData.on(touchClick, function() {
    resetData.style("display", "none");
    townInfo.style("display", "none");
    countyInfo.style("display", "none");
    mainInfo.style("display", "block");

});

// Define map projection
var projection = d3.geo.transverseMercator()
    .rotate([72.57, -44.20])
    .translate(translate)
    .scale(scale);

// Define path generator
var path = d3.geo.path()
    .projection(projection);

// Create SVG Element
var svg = d3.select("body").select("#mapbox").append("svg")
    .attr("width", width)
    .attr("height", height);

// Define scale to sort data values into color buckets
var color = d3.scale.threshold()
    .domain([1000, 5000, 7500, 10000, 20000, 30000, 50000, 75000, 100000])
    .range(["#fff7ec","#fee8c8","#fdd49e","#fdbb84","#fc8d59","#ef6548","#d7301f","#b30000","#7f0000"]);

// Legend Stuff

var y = d3.scale.sqrt()
    .domain([0, 100000])
    .range([0,325]);

var yAxis = d3.svg.axis()
    .scale(y)
    .tickValues(color.domain())
    .orient("right");

var countyDict = {
    1: ['Addision', 33817],
    3: ['Bennington', 47826],
    5: ['Caledonia', 48022],
    7: ['Chittenden', 61113],
    9: ['Essex', 4275],
    11: ['Franklin', 20560],
    13: ['Grand Isle', 0],
    15: ['Lamoille', 27790],
    17: ['Orange', 120189],
    19: ['Orleans', 25075],
    21: ['Rutland', 252309],
    23: ['Washington', 1207202],
    25: ['Windham', 419385],
    27: ['Windsor', 1066595]
};

function toUSD(num) {
    var number = num.toString(),

    dollars = number.split('.')[0],
    cents = (number.split('.')[1] || '') +'00';
    dollars = dollars.split('').reverse().join('')
        .replace(/(\d{3}(?!$))/g, '$1,')
        .split('').reverse().join('');
    return '$' + dollars;
}

queue()
    .defer(d3.json, "data/vermont.json")
    .defer(d3.json, "data/non-profit/big-np.json")
    .defer(d3.csv, "data/non-profit/vpr-irene-20130823-npMap.csv")
    .defer(d3.csv, "data/non-profit/vpr-vcf-20130703-org.csv")
    .await(ready);

function ready(error, vt, centroid, data, vcfData) {
    var townArray = [];
    var jsonArray = [];

    for (i = 0; i < data.length; i++) {
        var dataTown = data[i].town;
        var dataRotary = parseFloat(data[i].rotary);
        var dataEfficiency = parseFloat(data[i].efficiency);
        var dataFlood = parseFloat(data[i].flood);
        var dataPreservation = parseFloat(data[i].preservation);
        townArray.push(data[i].town.toUpperCase());

        for (j = 0; j < vt.objects.vt_towns.geometries.length; j++) {
            var jsonTown = vt.objects.vt_towns.geometries[j].properties.town;
            jsonArray.push(jsonTown);

            if (dataTown.toUpperCase() == jsonTown) {
                vt.objects.vt_towns.geometries[j].properties.rotary = dataRotary;
                vt.objects.vt_towns.geometries[j].properties.efficiency = dataEfficiency;
                vt.objects.vt_towns.geometries[j].properties.flood = dataFlood;
                vt.objects.vt_towns.geometries[j].properties.preservation = dataPreservation;
                break;
            }
        }
    }

    for (i = 1; i < 28; i +=2) {
        var vdrf = countyDict[i];

        for (j = 0; j < vt.objects.vt_towns.geometries.length; j++) {
            var jsonCounty = vt.objects.vt_towns.geometries[j].properties.county;
            if (i == jsonCounty) {
                vt.objects.vt_towns.geometries[j].properties.vdrf = vdrf[1];
            }
        }
    }

    var vermont = topojson.feature(vt, vt.objects.vt_towns);


    var g = svg.append("g")
        .attr("class", "key")
        .attr("transform", ("translate" + rKey))
        .call(yAxis);

    g.selectAll("rect")
        .data(color.range().map(function(d, i) {
            return {
                y0: i ? y(color.domain()[i - 1]) : y.range()[0],
                y1: i < color.domain().length ? y(color.domain()[i]) : y.range()[1],
                z: d
            };
        }))
        .enter().append("rect")
            .attr("width", 6)
            .attr("y", function(d) { return d.y0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .style("fill", function(d) { return d.z; });

    var towns;
    var org;
    function newMap() {
        var id;

        svg.append("path")
            .datum(vermont)
            .attr("d", path)
            .style("stroke", "#999")
            .style("stroke-width", "2px");


        towns = svg.selectAll("path.subunit")
            .data(topojson.feature(vt, vt.objects.vt_towns).features);

        towns.enter().append("path")
            .attr("class", "subunit")
            .attr("d", path)
            .style("stroke", "#ccc")
            .style("stroke-width", "1px")
            .style("fill", "#ddd");

        svg.append("path")
            .datum(topojson.feature(vt, vt.objects.lake))
            .attr("d", path)
            .style("stroke", "#6ba3eb")
            .style("stroke-width", "1px")
            .style("fill", "#b6d2f5");
    }

    newMap();
    symbolMap('vdrf');
    var organization = 'vdrf';

    function symbolMap(organization) {
        d3.selectAll("path.subunit")
            .style("fill", "#ddd")
            .on("mouseout", "")
            .on("mouseover", "");
        
        d3.selectAll("g")
            .style("display", "none");

        d3.selectAll(".symbol")
            .remove();

        var circleLegend = [
            {radius: radius(1.2e6), cx: xLegend, cy: yLegend},
            {radius: radius(2e5), cx: (xLegend + 32), cy: (yLegend - 90)},
            {radius: radius(5e4), cx: (xLegend + 43), cy: (yLegend - 135)},
            {radius: radius(1e4), cx: (xLegend + 50), cy: (yLegend - 165)}];

        var circleAmount = [
            {text: "$1,200,000", x: (xLegend + symbolText), y: (circleLegend[0].cy + 5)},
            {text: "$200,000", x: (xLegend + symbolText), y: (circleLegend[1].cy + 5)},
            {text: "$50,000", x: (xLegend + symbolText), y: (circleLegend[2].cy + 5)},
            {text: "$10,000", x: (xLegend + symbolText), y: (circleLegend[3].cy + 5)}];

        svg.selectAll("circle.guide")
            .data(circleLegend)
            .enter().append("circle")
                .attr("class", "guide symbol-remove")
                .attr("cx", function (d) { return d.cx; })
                .attr("cy", function (d) { return d.cy; })
                .attr("r", function (d) { return d.radius; });

        svg.selectAll("text.legend")
            .data(circleAmount)
            .enter().append("text")
                .attr("class", "legend symbol-remove")
                .attr("x", function (d) { return d.x; })
                .attr("y", function (d) { return d.y; })
                .text(function (d) { return d.text; });

        svg.selectAll(".symbol")
            .data(centroid.features.sort(function(a,b) {
                if (organization === 'vcf') {
                    return b.properties.vcf - a.properties.vcf;
                } else {
                    return b.properties.vdrf - a.properties.vdrf;
                }
            }))
            .enter().append("path")
                .attr("class", function(d) {
                    return ("symbol " + d.properties.unit);
                })
                .attr("d", path.pointRadius(function(d) {
                    if (organization === 'vcf') {
                        return radius(d.properties.vcf);
                    } else {
                        return radius(d.properties.vdrf);
                    }
                }))
                .style("fill", function(d) {
                    if (d.properties.unit === 'town') {
                        return "#e77565";
                    } else {
                        return "steelblue";
                    }
                });

        if (organization === 'vcf') {
            resetData.style("display", "none");
            townInfo.style("display", "none");
            countyInfo.style("display", "none");
            mainInfo.style("display", "block");

            svg.selectAll(".symbol")
                .on(touchClick, function(d) {
                    resetData.style("display", "block");

                if (d.properties.unit === 'town') {
                    var tableTotal = 0;
                    var tableArray = [];
                    var rowCount = 0;

                    for (var i=0; i < vcfData.length; i++) {
                        if (d.properties.name === vcfData[i].city) {
                            tableArray.push([
                                vcfData[i].organization,
                                toUSD(vcfData[i].amount)
                            ]);
                            tableTotal += parseFloat(vcfData[i].amount);
                            rowCount += 1;
                        }
                    }

                    if ( rowCount > 1 ) {
                        tableArray.push([
                            'Total',
                            toUSD(tableTotal)
                            ]);
                    }

                    mainInfo.style("display", "none");
                    countyInfo.style("display", "none");
                    townInfo.style("display", "block");
                    d3.select("#vcf-table").style("display", "table");

                    townInfo.select("h3")
                        .text(d.properties.name);

                    d3.select("tbody").selectAll("tr").remove();

                    var tr = d3.select("tbody").selectAll("tr")
                        .data(tableArray)
                        .enter().append("tr");

                    var td = tr.selectAll("td")
                        .data(function(d) { return d; })
                        .enter().append("td")
                            .text(function(d) { return d; });
                } else {
                    mainInfo.style("display", "none");
                    townInfo.style("display", "none");
                    countyInfo.style("display", "block");

                    countyInfo.select("h2")
                        .text("In " + d.properties.name);

                    countyInfo.select("h3#num-farmers")
                        .text(d.properties.number);

                    countyInfo.select("h3#dollar-farmers")
                        .text(toUSD(d.properties.vcf));
                }
            })
            .on("mouseover", function(d) {
                var xPosition = d3.mouse(this)[0];
                var yPosition = d3.mouse(this)[1] - 10;

                d3.select(this)
                    .style("stroke", "#ffffeb")
                    .style("stroke-width", "2px")
                    .style("fill-opacity", "1");

                svg.append("text")
                    .attr("id", "tooltip")
                    .attr("x", function(d) {
                        if (xPosition < 100) {
                            return xPosition + 40;
                        } else {
                            return xPosition;
                        }})
                    .attr("y", yPosition)
                    .attr("text-anchor", "middle")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "11px")
                    .attr("font-weight", "bold")
                    .attr("fill", "black")
                    .text(d.properties.name + " - " + toUSD(d.properties.vcf));
            })
            .on("mouseout", function(d) {
                d3.select("#tooltip").remove();

                d3.select(this)
                    .style("stroke", "#fff")
                    .style("stroke-width", "1px")
                    .style("fill-opacity", ".8");
            });


            svg.append("circle")
                .attr("class", "vcf-guide symbol-remove")
                .attr("cx", xCircle)
                .attr("cy", yCircle)
                .attr("r", "8")
                .style("fill", "steelblue")
                .on("mouseover", function(d) {
                    svg.selectAll(".town")
                        .style("display", "none");
                })
                .on("mouseout", function(d) {
                    svg.selectAll(".town")
                        .style("display", "block");
                });

            svg.append("text")
                .attr("class", "vcf-legend symbol-remove")
                .attr("x", xCircle + 15)
                .attr("y", yCircle + 4)
                .style("font-size", "12px")
                .text("Farmers");

            svg.append("circle")
                .attr("class", "vcf-guide symbol-remove")
                .attr("cx", xCircle + 80)
                .attr("cy", yCircle)
                .attr("r", "8")
                .style("fill", "#e77565")
                .on("mouseover", function(d) {
                    svg.selectAll(".farm")
                        .style("display", "none");
                })
                .on("mouseout", function(d) {
                    svg.selectAll(".farm")
                        .style("display", "block");
                });

            svg.append("text")
                .attr("class", "vcf-legend symbol-remove")
                .attr("x", xCircle + 95)
                .attr("y", yCircle + 4)
                .style("font-size", "12px")
                .text("Organizations");

            svg.append("text")
                .attr("class", "hover-text symbol-remove")
                .attr("x", xCircle - 3)
                .attr("y", yCircle + 30)
                .style("font-size", "11px")
                .style("color", "#777777")
                .text("Hover over circle to see category");

        } else {

            d3.selectAll("text.vcf-legend")
                .remove();

            d3.selectAll("circle.vcf-guide")
                .remove();

            d3.selectAll("text.hover-text")
                .remove();

            svg.selectAll(".symbol")
                .on("mouseover", function(d) {
                    var xPosition = d3.mouse(this)[0];
                    var yPosition = d3.mouse(this)[1] - 10;

                    d3.select(this)
                        .style("stroke", "#ffffeb")
                        .style("stroke-width", "2px")
                        .style("fill-opacity", "1");

                    svg.append("text")
                        .attr("id", "tooltip")
                        .attr("x", function(d) {
                            if (xPosition < 100) {
                                return xPosition + 40;
                            } else {
                                return xPosition;
                            }})
                        .attr("y", yPosition)
                        .attr("text-anchor", "middle")
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "11px")
                        .attr("font-weight", "bold")
                        .attr("fill", "black")
                        .text(d.properties.name + " - " + toUSD(d.properties.vdrf));
                })
                .on("mouseout", function(d) {
                    d3.select("#tooltip").remove();

                    d3.select(this)
                        .style("stroke", "#fff")
                        .style("stroke-width", "1px")
                        .style("fill-opacity", ".8");
                });
        }

        d3.select("div.np-map").selectAll("div.map-explanation")
            .style("display", "none");

        var id = ("div#" + organization + "-additional");

        d3.select("div.np-map").select(id)
            .style("display", "block");
    }

    function newMapOrg(organization) {
        d3.selectAll("path.subunit")
            .style("fill", function(d) {
                if (organization == 'rotary') {
                    org = d.properties.rotary;
                } else if (organization == 'efficiency') {
                    org = d.properties.efficiency;
                } else if (organization == 'flood') {
                    org = d.properties.flood;
                } else if (organization == 'preservation') {
                    org = d.properties.preservation;
                } else if (organization == 'vdrf') {
                    org = d.properties.vdrf;
                }

                if (org) {
                    return color(org);
                } else {
                    return "#ddd";
                }
            });

        d3.selectAll("path.symbol")
            .remove();

        d3.selectAll(".symbol-remove")
            .remove();

        d3.selectAll("g")
            .style("display", "block");

        d3.select("div.np-map").selectAll("div.map-explanation")
            .style("display", "none");


        var id = ("div#" + organization + "-additional");

        d3.select("div.np-map").select(id)
            .style("display", "block");

        towns.on("mouseover", function(d) {
            var xPosition = d3.mouse(this)[0];
            var yPosition = d3.mouse(this)[1] - 20;

            if (organization == 'rotary') {
                org = d.properties.rotary;
            } else if (organization == 'efficiency') {
                org = d.properties.efficiency;
            } else if (organization == 'flood') {
                org = d.properties.flood;
            } else if (organization == 'preservation') {
                org = d.properties.preservation;
            } else if (organization == 'vdrf') {
                org = d.properties.vdrf;
            }

            svg.append("text")
                .attr("id", "tooltip")
                .attr("x", function(d) {
                    if (xPosition < 100) {
                        return xPosition + 60;
                    } else {
                        return xPosition;
                    }})
                .attr("y", function(d) {
                    if (yPosition < 100) {
                        return yPosition + 50;
                    } else {
                        return yPosition;
                    }})
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-size", "11px")
                .attr("font-weight", "bold")
                .attr("fill", "black")
                .text(function() {
                    if (organization == 'vdrf' || organization === 'vcf') {
                        return (countyDict[d.properties.county][0] + ' County - ' + toUSD(org));
                    } else {
                        return (d.properties.town + ' - ' + toUSD(org));
                    }
                });


            d3.select(this)
                .style("fill", "#509e2f");
                })
                .on("mouseout", function(d) {
                    d3.select("#tooltip").remove();

                    d3.select(this)
                    .transition()
                    .duration(250)
                    .style("fill", function(d) {
                        if (organization == 'rotary') {
                            org = d.properties.rotary;
                        } else if (organization == 'efficiency') {
                            org = d.properties.efficiency;
                        } else if (organization == 'flood') {
                            org = d.properties.flood;
                        } else if (organization == 'preservation') {
                            org = d.properties.preservation;
                        } else {
                            org = 0;
                        }

                        if (org) {
                            return color(org);
                        } else {
                            return "#ddd";
                        }
                    });
                });

    }

    d3.selectAll("ul.nav-tabs li")
        .on("click", function (d) {
            organization = d3.select(this).attr("id").toLowerCase();
            if (organization === 'vcf' || organization === 'vdrf') {
                symbolMap(organization);
            } else {
                newMapOrg(organization);
            }
        });

}


