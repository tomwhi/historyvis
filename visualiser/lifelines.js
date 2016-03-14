// Person class:
function Person(link, name, birth, death) {
	this.link = link;
	this.name = name;
	this.birth = birth;
	this.death = death;
	this.mother = null;
	this.father = null;
	this.children = [];
	this.reigns = [];
}


Person.prototype = {
	setMother: function(mother) {
		this.mother = mother;
	},
	
	setFather: function(father) {
		this.father = father;
	},

	addChild: function(child) {
		this.children.push(child);
	},
	
	addReign: function(reign) {
		this.reigns.push(reign);
	},
	
	getRelatives: function() {
		var relatives = [];
		if(!(typeof this.mother === 'undefined')){
	    	relatives.push(this.mother);
		};
		if(!(typeof this.father === 'undefined')){
	    	relatives.push(this.father);
		};
		return relatives.concat(this.children);
	}
}


// FIXME/NOTE:
// I have selectedPeople and link2person appearing all over the place
// together. This is because the items in selectedPeople apparently
// need to be strings, due to javascript. Perhaps I should have
// some object that encapsulates a set of people, keeping this detail
// internal. Won't implement this yet though.


function getFirstBirth(selectedPeople, link2person) {
	peopleArr = Array.from(selectedPeople);
	earliestBirthDate = Infinity;
	var nPeople = peopleArr.length;

	for (var personIdx = 0; personIdx < nPeople; personIdx++) {
		currPersonObj = link2person[peopleArr[personIdx]];
		if (currPersonObj.birth < earliestBirthDate) {
			earliestBirthDate = currPersonObj.birth;
		}
	}
	
	return earliestBirthDate;
}


function getEndDeath(selectedPeople, link2person) {
	peopleArr = Array.from(selectedPeople);
	lastDeathDate = -Infinity;
	var nPeople = peopleArr.length;
	for (var personIdx = 0; personIdx < nPeople; personIdx++) {
		currPersonObj = link2person[peopleArr[personIdx]];
		if (currPersonObj.death > lastDeathDate) {
			lastBirthDate = currPersonObj.death;
		}
		
		// If no death is given, then the person is assumed to still
		// be alive => return the current year:
		if (currPersonObj.death === null) {
			var today = new Date();
			lastDeathDate = today.getFullYear();
		}
	}
	
	return lastDeathDate;
}


// A component of a lifeline plot, consisting of a set of interconnected
// lifeline bars:
function LifelinePlotComponent(peopleLinks, hostPlot) {
	this.peopleLinks = peopleLinks;
	this.hostPlot = hostPlot;

	// FIXME: Not sure about this: I believe I am duplicating data here, as I
	// have a link to the person objects directly, and also via their lifeline
	// objects:
	this.link2lifeline = {};
}


LifelinePlotComponent.prototype = {
	// Generates a Lifeline object for each person. Also, generates relevant
	// parent-child links, as Birthline objects:
	generateLifelines: function() {
		for (var personIdx = 0; personIdx < this.peopleLinks.length; personIdx++) {
			var currPersonLink = this.peopleLinks[personIdx];
			var currPerson = this.hostPlot.link2person[currPersonLink];

			var currLifeline = new Lifeline(currPerson, this);
			this.link2lifeline[currPersonLink] = currLifeline;
		}
	},

	// Generates Birthline objects for all Lifeline objects:
	generateBirthlines: function() {
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];

			// Make mother and father links if those individuals
			// are amongst the people to be plotted:
			var mother = currLifeline.person.mother;
			var father = currLifeline.person.father;

			if (mother !== undefined && this.hostPlot.peopleToPlot.has(mother.link)) {
				var motherLifeline = this.link2lifeline[mother.link];
				currLifeline.motherBirthline = new Birthline(currLifeline, motherLifeline);
			}

			if (father !== undefined && this.hostPlot.peopleToPlot.has(father.link)) {
				var fatherLifeline = this.link2lifeline[father.link];
				currLifeline.fatherBirthline = new Birthline(currLifeline, fatherLifeline);
			}
		}
	},
	
	// Assign relative positions to Lifeline objects in this lifeline
	// plot component:
	// FIXME/NOTE: This is where an algorithm could be specified as an
	// argument.
	assignRelativePositions: function() {
		// Finds coordinates for all individuals in the connected component
		// relative to the chosen focus node for this component graph.

		// XXX CONTINUE HERE: Review my planned algorithm and implement it here.
		
		// NOTE: I THINK THESE ARE PARTS OF THIS ALGORITHM, TO GO HERE:
		//		component.selectFocalNode(selectedLineages)
		//		component.assignLifelinePositions(algorithm)
		//		component.adjustForOverlaps()

	--- Inputs:
	---- Starting "focal point" node needs to be set for this component
	---- Index of link to node (not sure if I need this)
	---- All nodes in the connected component

	--- Algorithm:
	---- Assign the focal point node a position of zero
	---- Add (focalNode, 0) to the evaluation stack
	---- While evaluation stack is not empty:
	----- Pop top element and call evaluatePositions(currNode, currPos)

	},
	
	selectFocalNode: function(selectedLineages) {
		// Find a chosen node of interest for this connected component (e.g.
		// the most recent individual who is part of any of the lineages
		// specified):
		// XXX
	},
	
	evaluatePositions: function() {
		// NOTE: I need to sort some details out here, such as what the input parameters are, and how/where this "evaluation stack" is maintained.
		- NOTE: The following algorithm makes no attempt to balance the tree aesthetically. I will have to see what it looks like before deciding whether I need a better layout algorithm
		- Algorithm for assigning positions, given a node, specified position X for that node, a dictionary of URL->node pairs, indicating which nodes have been assigned positions already, and a stack of (node, position) objects to evaluate next.
		---- If mother node position not already determined (i.e. not in the dictionary)
		----- Assign mother node the position X - 1
		----- Add (mother, X-1) tuple to evaluation stack
		---- If father node position not already determined (i.e. not in the dictionary)
		----- Assign father node the position X + 1
		----- Add (father, X+1) tuple to evaluation stack
		---- For each child:
		----- Assign child node integer positions, keeping them balanced either side of X (e.g. X-1, X, X+1 for three nodes, or X-2, X-1, X+1, X+2 for four nodes).
		----- Add them to the evaluation stack
	}
}


// A plot of a set of lifeline bars:
function LifelinePlot(svgTarget, selectedPeople, selectedLineages, link2person) {
	// - Precondition: The input svg display must be blank when this method is invoked

	this.startYear = null; // Year corresponding to the start of the plot
	this.endYear = null; // Year corresponding to the end of the plot
	this.peopleToPlot = selectedPeople;
	this.link2person = link2person;
	this.plotComponents = [];
}


LifelinePlot.prototype = {
	calculateBoundaryYears: function() {
		// Calibrate the canvas start and end year based on the earliest birth
		// and last death dates:
		this.startYear = getFirstBirth(this.peopleToPlot, this.link2person);
		this.endYear = getEndDeath(this.peopleToPlot, this.link2person);
		
		console.log("TRACE: Years for plot:");
		console.log(this.startYear);
		console.log(this.endYear);
	},
	
	getYearCoord: function(year) {
		var bBox = this.svgTarget.getBBox();
	
		// Translate a year to a y position on the plot canvas:
		var fractionOfHeight = (year - this.startYear)/(this.endYear - this.startYear);
		var yPos = fractionOfHeight*bBox.height; // XXX I think this will work; but PROBLEM: Doesn't consider margins that I might wish to include around the plot itself.
		return yPos;
	},

	displayLifelines: function() {
		// Overview:
		/*
		-- Displays a given ancestry graph consisting of
		1) A set of individuals with birth and death dates
		2) A set of zero or more royalty titles with date ranges and corresponding
		individuals specified (it may be important for this to be indexed for
		efficient retrieval)
		3) A set of individual->individual edges indicating parent-child
		relationships, labelled as mother or father. NOTE: I need this data
		structure in a form that is computationally efficient to retrieve edges
		from. It might be necessary to have a sparse 2D matrix, but this would be
		large. -> Update: Not sure about my thinking here; I think it should be ok
		just having a dictionary indexed by person links, and by then looking in
		the mother/father/child fields for the given person of interest.
		--- Assigns x positions to all selected individuals (call function that
		does this)
		--- Draws rectangles and lines connecting them to represent those
		individuals and parent-child relationships
		--- Colours regions within rectangles to represent the specified titles
		*/

		var layoutAlgorithm = null; // XXX EDIT THIS

		// Calculate the start and end year for the plot:
		this.calculateBoundaryYears();

		// Determine connected components from the specified people to plot:
		var connectedComponents = getConnectedComponents(this.peopleToPlot, this.link2person);

		// Produce plot components corresponding to the connected components:
		for (var compIdx = 0; compIdx < connectedComponents.length; compIdx++) {
			var currComponent = connectedComponents[compIdx];
			var currPlotComponent = new LifelinePlotComponent(currComponent.nodes, this);

			// Generate lifeline objects for each of the people in the current
			// plot component. Here, also Generate parent/child links:
			currPlotComponent.generateLifelines();
			currPlotComponent.generateBirthlines();
			currPlotComponent.assignRelativePositions();

			this.plotComponents.push(currPlotComponent);
		}

		console.log(this);

		// XXX ONCE I'VE IMPLEMENTED THE RELATIVE POSITION DETERMINATION ALGORITHM, THEN IMPLEMENT THIS PART.
		// -- Render boxes and lines for the lifelines as determined by their relative positions within the connected components and the connected component relative positions and sizes. NOTE: This will involve calculating the absolute positions of the lifelines and parent-child lines. These calculations are specified by the relative positions (which are known by the lifeline objects), the connected component widths (which those objects can compute based on their constituent lifeline objects), the connected component relative positions (which can be assigned using some trivial algorithm and which has no real importance), and target svg canvas size, and the margin size (which is a default parameter of the lifelineplot class). NOTE: I need to decide which object(s) do the calculations of exact object positions. Perhaps the LifelinePlot object takes care of this? Also, I'm pretty sure the individual lifeline and parentChildLink objects should not know about their absolute positions; otherwise we would be duplicating data. However, they have links to their actual rectangle and line objects, so they can retrieve/set those values if needed.

		//	currComponentStartPos = 0
		//	for component in components:
		//		component.adjustForComponentStartPos()
		//		compoment.calculateTotalWidth()
		//		component.setAbsolutePositions() // add width to start position, plus a gap, and convert to actual canvas x positions

		//displayBoxes(lifelines)
	}
}


// Lifeline class - a rectangular representation of a person's lifespan,
// within a lifeline plot:
function Lifeline(person, hostPlot) {
	this.person = person;
	this.hostPlot = hostPlot;
	
	// Parent/Child birth lines for this individual (as a child):
	this.motherBirthline = null;
	this.fatherBirthline = null;

	// XXX FIXME: Perhaps these position fields will just be represented in the svgRectangle, rather than being specified here?:
	this.xStart = null;
	this.yStart = null;
	this.yEnd = null;
	this.boxWidth = null;
	this.svgRectangle = null;
	
	// XXX Should the lifeline have a set of links to child lifelines? Should it have a mother and father link?
}


// Methods of lifeline class: XXX
Lifeline.prototype = {
}


// Birthline class: A line representing the relationship between this parent
// and this child at the year of birth:
function Birthline(childLifeline, parentLifeline) {
	this.childLifeline = childLifeline;
	this.parentLifeline = parentLifeline;
	this.svgLine = null;
}


// Connected component class:
function ConnectedComponent() {
	this.nodes = [];
}


ConnectedComponent.prototype = {
	addNode: function(node) {
		this.nodes.push(node);
	}
}


// Reign class:
function Reign(lineage, start, end, person) {
	this.lineage = lineage;
	this.start = start;
	this.end = end;
	this.person = person;
}


// Lineage class:
function Lineage(link) {
	this.link = link;
	this.name = link; // FIXME: Edit this once lineage name information is available.
	this.reigns = [];
}


Lineage.prototype = {
	addReign: function(reign) {
		this.reigns.push(reign);
	},
	
	getPeople: function() {
		var people = new Set();
		var reigns = this.reigns;
		var nReigns = reigns.length;
		for (var reignIdx = 0; reignIdx < nReigns; reignIdx++) {
			var currReign = reigns[reignIdx];
			people.add(currReign.person);
		}
		return Array.from(people);
	}
}


// This is getting a bit hacky:
function getPersonName2Link(link2person) {
	// Extract person. NOTE: I'm assuming the names are unique (as are the
	// links):
	var name2link = {};
	for (var link in link2person) {
		var name = link2person[link].name;
		name2link[name] = link;
	}

	return name2link;
}


// This is getting a bit hacky:
function getLineageName2Link(link2lineage) {
	// PROBLEM/FIXME: Lineage links are used here; I want to have the names
	// instead:
	var name2link = {};
	for (var link in link2lineage) {
		var name = link2lineage[link].name;
		name2link[name] = link;
	}

	return name2link;
}


// Enters the person and lineage search data into the interface elements:
function populateInterface(personNames, lineageNames) {
	// Javascript UI code; don't yet understand this 100% but it's needed to
	// get my autocomplete boxes working:
	$(function() {
		$( "#personSelection" ).autocomplete({
			source: personNames
		});
	});
	
	$(function() {
		$( "#lineageSelection" ).autocomplete({
			source: lineageNames
		});
	});
}


function processTopOfStack(branchingStack, depths, outputSet, link2person) {
	var currPersonLink = branchingStack.pop();
	var currPerson = link2person[currPersonLink];
	
	outputSet.add(currPerson.link);
	
	if (depths[currPerson.link] > 0) {
		var relativeDepth = depths[currPerson.link] - 1;
		var relatives = currPerson.getRelatives();
		
		var nRelatives = relatives.length;
		for (var relativeIdx = 0; relativeIdx < nRelatives; relativeIdx++) {
			var relative = relatives[relativeIdx];
			if (!(outputSet.has(relative.link))) {
				// Relative has not yet been explored:
				if (!(relative.link in branchingStack)) {
					branchingStack.push(relative.link);
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
						console.log("2.");
						branchingStack.push(relative.link);
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
		currPerson = seedPeople[personIdx];
		personLink2depth[currPerson.link] = depth;
	}

	// Also maintain a stack of people left to branch from:
	var branchingStack = seedPeople.map(function(person) {return person.link});

	// Also maintain a set of people to output:
	var outputSet = new Set();

	while (branchingStack.length > 0) {
		processTopOfStack(branchingStack, personLink2depth, outputSet, link2person);
	}
	
	return outputSet;
}


function breadthFirstSearch(rootPerson, peopleAdded, personFilter, link2person) {
	// NOTE: personFilter is a set of person links denoting people that can
	// be included; all others should be ignored.

	var connectedComponent = new ConnectedComponent();
	
	var stack = [];
	stack.push(rootPerson);

	console.log("TRACE: Performing breadthFirstSearch from this root person:");
	console.log(rootPerson);
	
	while (stack.length > 0) {
		var currPerson = stack.pop();
		//console.log("currPerson:");
		//console.log(currPerson);

		//console.log("personFilter:");
		//console.log(personFilter);
		//console.log(personFilter.has(currPerson));

		if (personFilter.has(currPerson)) {
			//console.log("Branching from current person...");
			//console.log("TRACE: Connected component:");
			//console.log(connectedComponent);

			// The person is allowed to be added and branched from.
			connectedComponent.addNode(currPerson);

			//console.log("TRACE AGAIN: Connected component:");
			//console.log(connectedComponent);
			
			peopleAdded.add(currPerson);
 			//console.log("TRACE XXX: peopleAdded:");
			//console.log(peopleAdded);

			var actualPersonObj = link2person[currPerson];

			var relatives = actualPersonObj.getRelatives();
			var nRelatives = relatives.length;

			for (var relativeIdx = 0; relativeIdx < nRelatives; relativeIdx++) {
				var currRelativeObj = relatives[relativeIdx];
				// Only add item to the stack if it's in the filtered set of
				// people and they haven't already been added to a
				// connected component:
				if (personFilter.has(currRelativeObj.link) && !(peopleAdded.has(currRelativeObj.link))) {
					stack.push(currRelativeObj.link);
				}
			}

			//console.log("TRACE: Stack after adding relatives:");
			//console.log(stack);
		}
	}
	
	console.log("Completed.");

	return connectedComponent;
}


// FIXME: I have made a mess in these functions in terms of what is a person link
// and which variables are actual person objects. Also, the naming of variables is ambiguous.

function getConnectedComponents(selectedPeople, link2person) {
	console.log("GETTING CONNECTED COMPONENTS...");
	// Perform breadth-first search to find the connected components...
	var componentGraphs = [];

	var peopleAdded = new Set();

	var selectedPeopleArr = Array.from(selectedPeople);
	
	console.log("Selected people:");
	console.log(selectedPeopleArr);
	
	var nPeople = selectedPeopleArr.length;
	for (var personIdx = 0; personIdx < nPeople; personIdx++) {
		currPerson = selectedPeopleArr[personIdx];
		
		if (!(peopleAdded.has(currPerson))) {
			// The person has not been added to a connected component yet
			// => perform (filtered) breadth-first search from it, keeping track
			// of added nodes...
			// NOTE: Only the specified "selected people" will be included in
			// the breadth-first search:
			console.log("TRACE: peopleAdded:");
			console.log(peopleAdded);
			var currComponent = breadthFirstSearch(currPerson, peopleAdded, selectedPeople, link2person);
			componentGraphs.push(currComponent);
		}
	}

	console.log("Component graphs:");
	console.log(componentGraphs);
	console.log("Finished getting connected components.");

	// Return components (as an array of TimelineConnComp objects):
	return componentGraphs;
}


function updateLifelinePlot(targetSVG, personName2link, lineageName2link, link2person, link2lineage) {
	// User can select a set of lineages of interest and a set of additional individuals of interest.
	// XXX NEXT: Implement extractParamsFromInterface() and then test it + get it working here:
	//var params = extractParamsFromInterface();
	//var specifiedPeople = params[0];
	//var specifiedLineages = params[1];
	
	// TEST: REMOVE THESE TWO LINES ONCE PARAMETER EXTRACTION ABOVE IS WORKING:
	var specifiedLineages = [link2lineage["/wiki/List_of_Swedish_monarchs"]];//, link2lineage["/wiki/List_of_French_monarchs"]];
	var specifiedPeople = [];//[link2person["/wiki/Henry_VIII_of_England"], link2person["/wiki/Frederick_V,_Elector_Palatine"]];

	var peopleArrs = specifiedLineages.map(function (lineage) {return lineage.getPeople()});
	var peopleInLineages = Array.from(new Set(peopleArrs.reduce(function (list1, list2, currentIndex, array) {return list1.concat(list2)})));
	var seedIndividuals = new Set(peopleInLineages.concat(specifiedPeople));

	console.log("SEED:");
	console.log(seedIndividuals);
	
	// Retrieve the current depth setting from the interface:
	// XXX

	depth = 3;

	expandedIndividuals = expandIndividuals(Array.from(seedIndividuals), depth, link2person);
	console.log("UPDATED:");
	console.log(expandedIndividuals);

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
	console.log(jsonObj)

	// Extract names of people from the input:
	// FIXME: Add actual code for doing this here; get the names from the hydrated objects:
	var names = Object.keys(jsonObj).map(function(obj) {return obj.split("/")[2]})
	
	// Hydrate the data, retrieving a dictionary of link2person and link2lineage:
	var hydratedData = hydratePersonData(jsonObj);
	var link2person = hydratedData[0];
	var link2lineage = hydratedData[1];

	console.log(link2person);
	console.log(link2lineage);

	var personName2link = getPersonName2Link(link2person);
	var lineageName2link = getLineageName2Link(link2lineage);

	populateInterface(Object.keys(personName2link), Object.keys(lineageName2link));

	console.log(personName2link);
	console.log(lineageName2link)

	// Retrieve the svg target element from the webpage:
	var svgTarget = d3.select("#lifelinePlotSvg");
	
	updateLifelinePlot(svgTarget, personName2link, lineageName2link, link2person, link2lineage);
	//interface.onClick = updateLifelinePlot(personName2link, lineageName2link, link2person, link2lineage);
});















































