function processTopOfStack(branchingStack, depths, outputSet, link2person) {
	var topOfStack = branchingStack.pop();
	var currPersonLink = topOfStack[0];
	var addedAsChild = topOfStack[1];

	var currPerson = link2person[currPersonLink];
	
	outputSet.add(currPerson.link);

	var parentLinks = new Set(currPerson.getParents().map(function(x) {return x.link}));
	var childLinks = new Set(currPerson.getChildren().map(function(x) {return x.link}));
		
	if (depths[currPerson.link] > 0) {
		var relativeDepth = depths[currPerson.link] - 1;
		var relatives = currPerson.getRelatives();
		if (addedAsChild) {
			// Only consider the parents if this person was added for
			// expansion as a child:
			relatives = currPerson.getParents();
		}
		
		var nRelatives = relatives.length;
		for (var relativeIdx = 0; relativeIdx < nRelatives; relativeIdx++) {
			var relative = relatives[relativeIdx];

			if (!(outputSet.has(relative.link))) {
				// Relative has not yet been explored:
				if (!(relative.link in branchingStack)) {
					if (parentLinks.has(relative.link)) {
						branchingStack.push([relative.link, false]);
					} else {
						branchingStack.push([relative.link, true]);
					}
				}
				if ((!(relative.link in depths)) || (depths[relative.link] < relativeDepth)) {
					depths[relative.link] = relativeDepth;
				}
			} else {
				// Relative has been explored but may still need further
				// exploration depending on depth:
				if (depths[relative.link] < relativeDepth) {
					depths[relative.link] = relativeDepth;
					if (!(relative.link in branchingStack)) {
						if (parentLinks.has(relative.link)) {
							branchingStack.push([relative.link, false]);
						} else {
							branchingStack.push([relative.link, true]);
						}
					}
				}
			}
		}
	}
}


function expandIndividuals(seedPeople, depth, link2person) {
	// Perform expansion in parents and children by the specified distance...
	var nPeople = seedPeople.length;
	
	// Maintain a dictionary indicating depth for each person:
	var personLink2depth = {};
	for (var personIdx = 0; personIdx < nPeople; personIdx++) {
		var currPerson = seedPeople[personIdx];
		personLink2depth[currPerson.link] = depth;
	}

	// Implementing a refined approach for branching: The behaviour will
	// differ when branching from a child node, compared to other nodes
	// (starting node or parent node).

	// Also maintain a stack of people left to branch from:
	var branchingStack = seedPeople.map(function(person) {return [person.link, false]});

	// Also maintain a set of people to output:
	var outputSet = new Set();

	while (branchingStack.length > 0) {
		processTopOfStack(branchingStack, personLink2depth, outputSet, link2person);
	}
	
	return outputSet;
}


function updateLifelinePlot(targetSVG, personName2link, lineageName2link, link2person, link2lineage) {
	// User can select a set of lineages of interest and a set of additional individuals of interest.
	// XXX NEXT: Implement extractParamsFromInterface() and then test it + get it working here:
	//var params = extractParamsFromInterface();
	//var specifiedPeople = params[0];
	//var specifiedLineages = params[1];
	
	// TEST: REMOVE THESE TWO LINES ONCE PARAMETER EXTRACTION ABOVE IS WORKING:
	var specifiedLineages = [link2lineage["/wiki/List_of_Swedish_monarchs"]];// Swedish, /wiki/Holy_Roman_Emperor ;//];// link2lineage["/wiki/List_of_Swedish_monarchs"]
	var specifiedPeople = [link2person["/wiki/Gustavus_Adolphus_of_Sweden"], link2person["/wiki/Louis_XIV_of_France"]];// [link2person["/wiki/Frederick_I_of_Sweden"], link2person["/wiki/Frederick_V,_Elector_Palatine"]];//  /wiki/John_III_of_Sweden /wiki/Henry_VIII_of_England

	var peopleInLineages = [];
	if (specifiedLineages.length > 0) {
		var peopleArrs = specifiedLineages.map(function (lineage) {return lineage.getPeople()});
		var peopleInLineages = Array.from(new Set(peopleArrs.reduce(function (list1, list2, currentIndex, array) {return list1.concat(list2)})));
	}
	var seedIndividuals = new Set(peopleInLineages.concat(specifiedPeople));

	//console.log("SEED:");
	//console.log(seedIndividuals);
	
	// Retrieve the current depth setting from the interface:
	// XXX

	depth = 1;

	var expandedIndividuals = expandIndividuals(Array.from(seedIndividuals), depth, link2person);
	//console.log("UPDATED:");
	//console.log(expandedIndividuals);

	// Clear the svg element, as it must be blank prior to generating a new
	// lifeline plot using it:
	clearSVG(targetSVG);

	newPlot = new LifelinePlot(targetSVG, expandedIndividuals, specifiedLineages, link2person);
	newPlot.displayLifelines();
}


function clearSVG(svg) {
	while (svg[0][0].lastChild) {
	    svg[0][0].removeChild(svg[0][0].lastChild);
	}
}


// NOTE: This function might introduce performance problems; need to test.
// Also, could be refactored.
function hydratePersonData(jsonObj) {
	var link2person = {};
	var links = Object.keys(jsonObj)
	var nLinks = links.length;
	for (var linkIdx = 0; linkIdx < nLinks; linkIdx++) {
		currLink = links[linkIdx];
		currVals = jsonObj[currLink];
		var currPerson = new Person(currLink, currVals['name'], currVals['birth'], currVals['death'])
		link2person[currLink] = currPerson;
	}

	// Keep track of all lineages:
	var link2lineage = {};

	// Need to make a second pass over the person objects to generate links:
	links = Object.keys(link2person);
	for (var personIdx = 0; personIdx < nLinks; personIdx++) {
		var currLink = links[personIdx];
		var currPerson = link2person[currLink];
		var currVals = jsonObj[currLink];
		var mother = link2person[currVals['mother']];
		currPerson.setMother(mother);
		var father = link2person[currVals['father']];
		currPerson.setFather(father);
		var childLinks = currVals['children']
		var nChildLinks = childLinks.length;
		for (var childIdx = 0; childIdx < nChildLinks; childIdx++) {
			var currChildLink = childLinks[childIdx];
			var currChild = link2person[currChildLink];
			currPerson.addChild(currChild);
		}

		var reignInfo = currVals['reigns'];
		var reignLinks = Object.keys(reignInfo);
		nReigns = reignLinks.length;
		for (var reignIdx = 0; reignIdx < nReigns; reignIdx++) {
			var currReignLink = reignLinks[reignIdx];

			var currLineage = null;
			if (!(currReignLink in link2lineage)) {
				link2lineage[currReignLink] = new Lineage(currReignLink);
			}

			currLineage = link2lineage[currReignLink];
			
			// Generate a new Reign object linking to the above lineage:
			var currReign = new Reign(currLineage, reignInfo[currReignLink][0], reignInfo[currReignLink][1], currPerson);
			currLineage.addReign(currReign);
			
			currPerson.addReign(currReign);
		}
	}

	return [link2person, link2lineage];
}


// Load the JSON data specifying the nobility data:
d3.json("Test.json", function(error, jsonObj) {
	if (error) throw error;
	//console.log(jsonObj)

	// Extract names of people from the input:
	// FIXME: Add actual code for doing this here; get the names from the hydrated objects:
	var names = Object.keys(jsonObj).map(function(obj) {return obj.split("/")[2]})
	
	// Hydrate the data, retrieving a dictionary of link2person and link2lineage:
	var hydratedData = hydratePersonData(jsonObj);
	var link2person = hydratedData[0];
	var link2lineage = hydratedData[1];

	//console.log(link2person);
	//console.log(link2lineage);

	var personName2link = getPersonName2Link(link2person);
	var lineageName2link = getLineageName2Link(link2lineage);

	populateInterface(Object.keys(personName2link), Object.keys(lineageName2link));

	//console.log(personName2link);
	//console.log(lineageName2link)

	// Retrieve the svg target element from the webpage:
	var svgTarget = d3.select("#lifelinePlotSvg");
	
	updateLifelinePlot(svgTarget, personName2link, lineageName2link, link2person, link2lineage);
	//interface.onClick = updateLifelinePlot(personName2link, lineageName2link, link2person, link2lineage);
});
