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


// Connected component class:
function ConnectedComponent() {
	this.nodes = [];
}


ConnectedComponent.prototype = {
	addNode: function(node) {
		this.nodes.push(nodes);
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


function breadthFirstSearch(rootPerson, peopleAdded, personFilter) {
	// NOTE: personFilter is a set of person links denoting people that can
	// be included; all others should be ignored.

	var connectedComponent = new ConnectedComponent();
	
	var stack = [];
	stack.push(rootPerson);

	while (stack.length > 0) {
		var currPerson = stack.pop();
		if (personFilter.has(currPerson.link)) {
			// The person is allowed to be added and branched from.
			connectedComponent.addNode(currPerson);
			
			peopleAdded.add(currPerson.link);
			var relatives = currPerson.getRelatives();
			var nRelatives = relatives.length;
			if (var relativeIdx = 0; relativeIdx < nRelatives; relativeIdx++) {
				var currRelative = relatives[nRelatives];
				stack.push(currRelative);
			}
		}
	}
	
	return connectedComponent;
}


function getConnectedComponents(selectedPeople) {
	// Perform breadth-first search to find the connected components...
	var componentGraphs = [];

	var peopleAdded = new Set();

	var nPeople = selectedPeople.length;
	for (personIdx = 0; personIdx < nPeople; personIdx++) {
		var currPerson = selectedPeople[personIdx];
		if (!(peopleAdded.has(currPerson.link))) {
			// The person has not been added to a connected component yet
			// => perform breadth-first search from it, keeping track
			// of added nodes...
			var currComponent = breadthFirstSearch(currPerson, peopleAdded, personFilter);
			componentGraphs.push(currComponent);
		}
	}

	// XXX CONTINUE HERE: Test and debug this new code.

	// Return components (as an array of TimelineConnComp objects):
	return componentGraphs;
}


function generateLifelines(selectedPeople, selectedLineages, algorithm) {
	var connectedComponents = getConnectedComponents(selectedPeople);
	console.log(connectedComponents);
	var lifelines = null;
	return lifelines;
//	currComponentStartPos = 0
//	for component in components:
//		component.selectFocalNode(selectedLineages)
//		component.assignLifelinePositions(algorithm)
//		component.adjustForOverlaps()
//		component.adjustForComponentStartPos()
//		compoment.calculateTotalWidth()
//		component.setAbsolutePositions() // add width to start position, plus a gap, and convert to actual canvas x positions
}


function displayLifelines(selectedPeople, selectedLineages) {
	// Overview:
	/*
	-- Function to display a given ancestry graph consisting of
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

	var lifelines = generateLifelines(selectedPeople, layoutAlgorithm);
	//displayBoxes(lifelines)
}


function updateLifelines(personName2link, lineageName2link, link2person, link2lineage) {
	// User can select a set of lineages of interest and a set of additional individuals of interest.
	// XXX NEXT: Implement extractParamsFromInterface() and then test it + get it working here:
	//var params = extractParamsFromInterface();
	//var specifiedPeople = params[0];
	//var specifiedLineages = params[1];
	
	// TEST: REMOVE THESE TWO LINES ONCE PARAMETER EXTRACTION ABOVE IS WORKING:
	var specifiedLineages = [link2lineage["/wiki/List_of_Swedish_monarchs"], link2lineage["/wiki/List_of_French_monarchs"]];
	var specifiedPeople = [link2person["/wiki/Henry_VIII_of_England"], link2person["/wiki/Frederick_V,_Elector_Palatine"]];

	var peopleArrs = specifiedLineages.map(function (lineage) {return lineage.getPeople()});
	var peopleInLineages = Array.from(new Set(peopleArrs.reduce(function (list1, list2, currentIndex, array) {return list1.concat(list2)})));
	var seedIndividuals = new Set(peopleInLineages.concat(specifiedPeople));

	console.log("SEED:");
	console.log(seedIndividuals);
	
	// Retrieve the current depth setting from the interface:
	// XXX

	// SOME WEIRD BUG HERE.	
	depth = 4;

	expandedIndividuals = expandIndividuals(Array.from(seedIndividuals), depth, link2person);
	console.log("UPDATED:");
	console.log(expandedIndividuals);
	displayLifelines(expandedIndividuals, lineages)
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

	// Perhaps I need to create or select the canvas element here, to be specified as a parameter to displayLifelines and updateLifelines?
	updateLifelines(personName2link, lineageName2link, link2person, link2lineage);
	//interface.onClick = updateLifelines(personName2link, lineageName2link, link2person, link2lineage);
});















































