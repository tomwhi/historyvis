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
	},

	getDeath: function() {
		if (this.death === null) {
			var today = new Date();
			return today.getFullYear();
		} else {
			return this.death;
		}
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


function compareBirth(lifeline1, lifeline2) {
	// Compare the two lifeline objects by birth date:
	return lifeline1.person.birth - lifeline2.person.birth;
}


// NOTE/FIXME: I think I can do better than this, to achieve more compressed results:
function detectClusters(lifelinesByBirth) {
	// Input must be lifelines sorted by birth date.
	
	var outputClusters = [];
	var prevDeath = -Infinity;
	var currCluster = [];
	
	for (var lifelineIdx = 0; lifelineIdx < lifelinesByBirth.length; lifelineIdx++) {
		var currLifeline = lifelinesByBirth[lifelineIdx];
		if (currLifeline.person.birth > prevDeath) {
			// This is a new cluster...

			if (currCluster.length > 0) {
				// There was a preceding cluster => Add it to the output
				// clusters:
				outputClusters.push(currCluster);
			}
			
			// Start out this new cluster:
			currCluster = [];
		}
		
		// Add the current lifeline to this cluster:
		currCluster.push(currLifeline);
		
		// Update the end death date for this cluster:
		var currPersonDeath = currLifeline.person.getDeath();
		prevDeath = currPersonDeath;
	}
	
	// Add the final cluster to the output and return them all:
	outputClusters.push(currCluster);
	return outputClusters;
}


function adjustGridPositions(cluster, leftEnd, rightEnd) {
	// Adjust the grid positions of the specified lifelines, to span the given
	// position range relative to the starting grid position for each lifeline
	// in the cluster, which should be the same to start with.
	
	var numLifelines = cluster.length;
	var numPositionsIncludingEnds = numLifelines + 2;
	var incrementSize = (rightEnd-leftEnd) / (numPositionsIncludingEnds-1);
	for (var lifelineIdx = 0; lifelineIdx < numLifelines; lifelineIdx++) {
		var currLifeline = cluster[lifelineIdx];

		var currAdjustment = leftEnd + (incrementSize * (lifelineIdx+1));
		
		// Update position for the current lifeline:
		currLifeline.gridPosition = currLifeline.gridPosition + currAdjustment;
	}
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
	
	// Adjust the x position of every lifeline in this component, adding
	// the specified amount...
	adjustOverallPosition: function(adjustment) {
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			currLifeline.gridPosition += adjustment;
		}
	},
	
	evaluatePositions: function(evaluationStack) {
		// This sets positions of relatives if they're not already set,
		// and adds them to the evaluationStack so that their relatives
		// can also be assigned positions.

		// Get the lifeline on the top of the stack:
		var currLifeline = evaluationStack.pop();
		
		//console.log("Evaluating positions...");
		//console.log(currLifeline.person.link);

		// Required information for this algorithm:
		// - A lifeline, which will be assigned the specified grid position. We
		// will assign a grid position for each relative of this lifeline, for
		// every relative that has not already been assigned a position.
		// - A specified X grid position for that node
		// - A set of links, indicating which individual's lifelines have been
		// added for position evaluation already
		// - A stack of [lifeline, position] pairs to evaluate next.

		//- NOTE: The following algorithm makes no attempt to balance the tree
		// aesthetically. I will have to see what it looks like before deciding
		// whether I need a better layout algorithm.

		// Retrieve the grid position of this lifeline:
		var currGridPos = currLifeline.gridPosition;
		
		// Get relatives:
		var person = currLifeline.person;
		var mother = person.mother;
		var father = person.father;
		var children = person.children;
		
		// Add mother at X-1 if lifeline is existing and not already specified:
		if (mother !== undefined) {
			var motherLifeline = this.link2lifeline[mother.link];
			if (motherLifeline !== undefined) {
				if (motherLifeline.gridPosition === null) {
					motherLifeline.gridPosition = currGridPos - 1;
					evaluationStack.push(motherLifeline);
				} else {
					//console.log("NOTE: Mother already had position assigned!");
					//console.log(motherLifeline);
				}
			}
		}
		
		// Add father at X+1 if lifeline is existing and not already specified:
		if (father !== undefined) {
			var fatherLifeline = this.link2lifeline[father.link];
			if (fatherLifeline !== undefined) {
				if (fatherLifeline.gridPosition === null) {
					fatherLifeline.gridPosition = currGridPos + 1;
					evaluationStack.push(fatherLifeline);
				} else {
					//console.log("NOTE: Father already had position assigned!");
					//console.log(fatherLifeline);
				}
			}
		}

		// Add children at X+1 if this person is the child's mother, and
		// X-1 otherwise (in which case this person is the child's father):
		for (var childIdx = 0; childIdx < children.length; childIdx++) {
			var currChild = children[childIdx];
			var currChildLifeline = this.link2lifeline[currChild.link];
			var childLink = currChild.link;
			if (currChildLifeline !== undefined) {
				if (currChildLifeline.gridPosition === null) {
					if (currChild.mother === person) {
						currChildLifeline.gridPosition = currGridPos + 1;
					} else {
						currChildLifeline.gridPosition = currGridPos - 1;
					}
					evaluationStack.push(currChildLifeline);
				} else {
					//console.log("NOTE: Child already had position assigned!");
					//console.log(currChildLifeline);
				}
			}
		}
	},

	assignStartingPositions: function(focalLifeline) {
		// While evaluation stack is not empty:
		// Pop top element and call evaluatePositions(currNode, currPos)

		// Assign the focal point node a position of zero, as it will be the
		// centre feature for this component:
		focalLifeline.gridPosition = 0;

		// Add (focalNode, 0) to the evaluation stack
		// This stack keeps track of lifelines that have not yet been assigned
		// positions, along with their proposed starting position:
		var evaluationStack = [];
		evaluationStack.push(focalLifeline);

		while (evaluationStack.length > 0) {
			this.evaluatePositions(evaluationStack);
		}
	},

	getLifelinesAtPos: function(currGridPos) {
		var lifelinesAtPos = [];
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			var lifelineGridPos = currLifeline.gridPosition;
			if (currGridPos == lifelineGridPos) {
				lifelinesAtPos.push(currLifeline);
			}
		}
		return lifelinesAtPos;
	},

	adjustPositionsForOverlap: function() {
		// Move lifeline objects sideways slightly so that none of them
		// overlap vertically.
		
		// Consider each integer grid position currently assigned to lifelines
		// in this component...
		var lowestGridPos = Infinity;
		var highestGridPos = -Infinity;
		
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			var currGridPos = currLifeline.gridPosition;
			if (currGridPos < lowestGridPos) {
				lowestGridPos = currGridPos;
			}
		}
		
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			var currGridPos = currLifeline.gridPosition;
			if (currGridPos > highestGridPos) {
				highestGridPos = currGridPos;
			}
		}

		var currGridPos = lowestGridPos;
		while (currGridPos <= highestGridPos) {
			// Get all Lifeline objects with this grid position:
			currLifelines = this.getLifelinesAtPos(currGridPos);
			
			// Iterate through them, detecting clusters of overlapping
			// lifelines, and "jittering" the lifelines in each cluster
			// so that every lifeline has a unique grid position...
			// Details of "jittering" for a given cluster: Disperse the given
			// timelines evenly between values -0.4 and +0.4 with respect to
			// the given grid position, starting with the first born
			// individual and ending with the last born individual.

			// First, sort by birth date:
			lifelinesByBirth = currLifelines.sort(compareBirth);

			// Detect clusters:
			lifelineClusters = detectClusters(lifelinesByBirth);
			
			// Process each cluster:
			for (var clusterIdx = 0; clusterIdx < lifelineClusters.length; clusterIdx++) {
				var currCluster = lifelineClusters[clusterIdx];
				adjustGridPositions(currCluster, -0.5, 0.5);
			}
			
			currGridPos++;
		}
	},

	getMinGridPos: function() {
		var minPos = Infinity;
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			if (currLifeline.gridPosition < minPos) {
				minPos = currLifeline.gridPosition;
			}
		}		
		return minPos;
	},

	getMaxGridPos: function() {
		var maxPos = -Infinity;
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			if (currLifeline.gridPosition > maxPos) {
				maxPos = currLifeline.gridPosition;
			}
		}
		return maxPos;
	},

	// Calculate the width of this component in grid units:
	getWidth: function() {
		var maxGridPos = this.getMaxGridPos();
		var minGridPos = this.getMinGridPos();
        return maxGridPos - minGridPos;
	},

	// Assign relative positions to Lifeline objects in this lifeline
	// plot component:
	// FIXME/NOTE: This is where an algorithm could be specified as an
	// argument.
	assignRelativePositions: function() {
		// Finds coordinates for all individuals in the connected component
		// relative to a chosen focus node for this component graph.

		// FIXME: This function possibly has too much "intelligence" in it.
		// In the long run, I intend to have different layout algorithms that
		// perform the task of laying out the Lifeline objects. This will help
		// in decomposing this logic into smaller parts.
		//console.log("Getting focal person.");
		//console.log((new Date()).getTime());
		var focalPerson = this.selectFocalPerson();

		// Get the timeline for that person:
		var focalTimeline = this.link2lifeline[focalPerson.link];

		this.assignStartingPositions(focalTimeline);
		
		this.adjustPositionsForOverlap();
	},
	
	selectFocalPerson: function() {
		// Find a chosen node of interest for this connected component (e.g.
		// the most recent individual who is part of any of the lineages
		// specified).

		// Retrieve the lineages selected in the host plot:
		var lineageLinkSet = new Set(this.hostPlot.lineagesToShow.map(function(lineage) {return lineage.link}));
		
		// Consider all individuals in any of those lineages, and select the individual
		// with the most recent birth date...

		// Filter for representation in those lineages:
		var peopleInLineagesLinks = new Set();
		for (var personIdx = 0; personIdx < this.peopleLinks.length; personIdx++) {
			var currPersonLink = this.peopleLinks[personIdx];
			var currPerson = this.hostPlot.link2person[currPersonLink];
			var currReigns = currPerson.reigns;

			for (var reignIdx = 0; reignIdx < currReigns.length; reignIdx++) {
				var currReign = currReigns[reignIdx];
				var currLineageLink = currReign.lineage.link;
				if (lineageLinkSet.has(currLineageLink)) {
					peopleInLineagesLinks.add(currPersonLink);
				}
			}			
		}
		
		if (peopleInLineagesLinks.length == 0) {
			// There were no individuals in the specified lineages =>
			// Consider all individuals:
			peopleInLineagesLinks = new Set(this.peopleLinks);
		}

		// Get person objects corresponding to the people in the lineages:
		var peopleInLineages = [];
		var linksArr = Array.from(peopleInLineagesLinks);
		for (var linkIdx = 0; linkIdx < linksArr.length; linkIdx++) {
			var currPersonLink = linksArr[linkIdx];
			var currPerson = this.hostPlot.link2person[currPersonLink];
			peopleInLineages.push(currPerson);
		}

		// Select the individual with the most recent birth date:
		var youngestPerson = null;
		var mostRecentBirthDate = -Infinity;
		for (var personIdx = 0; personIdx < peopleInLineages.length; personIdx++) {
			var currPerson = peopleInLineages[personIdx];
			if (currPerson.birth > mostRecentBirthDate) {
				mostRecentBirthDate = currPerson.birth;
				youngestPerson = currPerson;
			}
		}
		
		return youngestPerson;
	},
	
	draw: function() {
		// Draw this lifeline plot component on the host svg element...
		
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			currLifeline.draw();
		}
	}
}


// A plot of a set of lifeline bars:
function LifelinePlot(svgTarget, selectedPeople, selectedLineages, link2person) {
	// - Precondition: The input svg display must be blank when this method is invoked

	this.startYear = null; // Year corresponding to the start of the plot
	this.endYear = null; // Year corresponding to the end of the plot
	this.peopleToPlot = selectedPeople;
	this.lineagesToShow = selectedLineages;
	this.link2person = link2person;
	this.plotComponents = [];
	this.svgTarget = svgTarget;
	
	 // Margin will occupy this much of the svg element:
	this.marginFraction = 0.1;
	
	this.boxWidth = 2; // XXX FIXME. Not sure how/where to specify this and in what units.
}


LifelinePlot.prototype = {
	calculateBoundaryYears: function() {
		// Calibrate the canvas start and end year based on the earliest birth
		// and last death dates:
		this.startYear = getFirstBirth(this.peopleToPlot, this.link2person);
		this.endYear = getEndDeath(this.peopleToPlot, this.link2person);
		
		//console.log("TRACE: Years for plot:");
		//console.log(this.startYear);
		//console.log(this.endYear);
	},
	
	getYearCoord: function(year) {
		// FIXME: This has got to be wrong:
		var svgHeight = this.svgTarget[0][0].clientHeight;
			
		// Translate a year to a y position on the plot canvas:
		var fractionOfHeight = (year - this.startYear)/(this.endYear - this.startYear);
		var yPos = fractionOfHeight*svgHeight; // XXX I think this will work; but PROBLEM: Doesn't consider margins that I might wish to include around the plot itself.
		return yPos;
	},

	getSvgWidth: function() {
		// FIXME: This has got to be wrong:
		return this.svgTarget[0][0].clientWidth;
	},
	
	// Hacky method to convert x postion as a fraction of width to
	// an actual x coordinate on the svg element, taking the margin width
	// into consideration:
	fraction2position: function(fractionOfWidth) {
		var marginWidth = this.marginFraction * this.getSvgWidth();
		var plotWidth = (1 - (this.marginFraction * 2)) * this.getSvgWidth();
		var extraDist = fractionOfWidth * plotWidth;
		return marginWidth + extraDist;
	},
	
	convertXpos: function(gridPos) {
		var svgWidth = this.getSvgWidth();
		
		// Translate a grid position to an x postion on the plot canvas:
		var gridWidth = this.getGridWidth();
		var fractionOfWidth = gridPos/gridWidth;
		
		// FIXME: Not quite correct but oh well:
		//console.log("X pos:");
		//console.log(fractionOfWidth * svgWidth);
		// Add a margin - temporary hack, for the sake of seeing whether
		// visualisations are working:
		
		return this.fraction2position(fractionOfWidth);//fractionOfWidth * svgWidth;
	},

	getMinGridPos: function() {
		return this.plotComponents[0].getMinGridPos();
	},

	getMaxGridPos: function() {
		var lastComponent = this.plotComponents[this.plotComponents.length - 1];
		return lastComponent.getMaxGridPos();
	},

	getGridWidth: function() {
		return this.getMaxGridPos() - this.getMinGridPos();
	},

	convertYpos: function(yPos) {
		// XXX FIXME: Adjust to include margin:
		return this.getYearCoord(yPos);
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

		// Adjust lifeline grid positions again, to add cumulative width to
		// components two onwards, thus separatting them horizontally...

		// Need to shift all components by the negative or postive overhang
		// amount obtained for the left-most component:
		var leftMostComponent = this.plotComponents[0];
		var leftShift = -leftMostComponent.getMinGridPos();
		
		var cumulativeWidth = 0;
		for (var compIdx = 0; compIdx < this.plotComponents.length; compIdx++) {
			var currComponent = this.plotComponents[compIdx];
			
			console.log(currComponent);
			var currComponentWidth = currComponent.getWidth();
			
			currComponent.adjustOverallPosition(cumulativeWidth + leftShift);
						
			cumulativeWidth = cumulativeWidth + currComponentWidth;
		}

		console.log("TRACE: Plot after adjusting widths:");
		console.log(this);
		
		// Render each of the components on the svg element:
		for (var compIdx = 0; compIdx < this.plotComponents.length; compIdx++) {
			var currComponent = this.plotComponents[compIdx];
			currComponent.draw();
		}		

		// XXX CONTINUE HERE NEXT: I have starting grid positions now. Now, I am ready to implement
		// drawing of lifelines and birthlines on the svg element.
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
function Lifeline(person, hostComponent) {
	this.person = person;
	this.hostComponent = hostComponent;
	
	// Parent/Child birth lines for this individual (as a child):
	this.motherBirthline = null;
	this.fatherBirthline = null;
	
	this.gridPosition = null; // A grid position on the plot.

	this.svgRectangle = null;
	
	// XXX Should the lifeline have a set of links to child lifelines? Should it have a mother and father link?
}


// Methods of lifeline class:
Lifeline.prototype = {
	getXstart: function() {
		return this.hostComponent.hostPlot.convertXpos(this.gridPosition);
	},
	
	getYstart: function() {
		return this.hostComponent.hostPlot.convertYpos(this.person.birth);
	},

	getYend: function() {
		return this.hostComponent.hostPlot.convertYpos(this.person.getDeath());
	},
	
	draw: function() {
		var xStart = this.getXstart();
		var yStart = this.getYstart();
		var yEnd = this.getYend();
		
		// Generate the actual svg rectangle:
		var boxWidth = this.hostComponent.hostPlot.boxWidth;
		this.svgRectangle = this.hostComponent.hostPlot.svgTarget.append("rect")
							   					   .attr("x", xStart)
												   .attr("y", yStart)
												   .attr("width", boxWidth)
												   .attr("height", yEnd-yStart);

		// FIXME: A bit hacky: Add a click listener to the wikipedia page:
		var lifeline = this;
		var callback = function() {console.log(lifeline); lifeline.select(1)}
		this.svgRectangle[0][0].addEventListener("click", callback);//person.select

		// Draw the mother and father birthlines, if they exist:
		if (this.motherBirthline !== null) {
			this.motherBirthline.draw();
		}

		if (this.fatherBirthline !== null) {
			this.fatherBirthline.draw();
		}
	},
	
	select: function(depth) {
		var person = this.person;
		var currLink = "https://en.wikipedia.org".concat(person.link);

		// Depth of 1 indicates direct selection => clear everything first:
		// FIXME: This seems hacky - I'm altering all rectangles in the svg.
		var rectangles = this.hostComponent.hostPlot.svgTarget.selectAll("rect");

		// FIXME: Need to decide how/where to specify starting colour properly
		// for resetting the colour:
		//var startingColour = "black";
		//rectangles.attr("stroke", startingColour).attr("fill", startingColour);

		displaySelected(this.svgRectangle, depth);
		
		// "Select" the mother and father lifelines recursively, if selection
		// "depth" is not too high:
		if (depth <= 2) {
			if (this.motherBirthline !== undefined && this.motherBirthline !== null) {
				var parentLifeline = this.motherBirthline.parentLifeline;
				parentLifeline.select(depth+1);
			}
			if (this.fatherBirthline !== undefined && this.fatherBirthline !== null) {
				var parentLifeline = this.fatherBirthline.parentLifeline;
				parentLifeline.select(depth+1);
			}
		}

		document.getElementsByTagName("iframe")[0].src=currLink;
	}
}


// FIXME: Code for indicating selection of a rectangle with a specified
// intensity level. Should replace this with a CSS class name approach,
// once I can get that working for SVG elements:
function displaySelected(svgRectangle, intensityLevel) {
	// FIXME: Really nasty hack; need a better way to do this:
	var colour1 = "#47EDFF";
	var colour2 = "#36B8C7";
	var colour3 = "#247B85";
	var selectedColour = colour1;
	if (intensityLevel == 2) {
		selectedColour = colour2;
	} else if (intensityLevel == 3) {
		selectedColour = colour3;
	} else if (intensityLevel > 3) {
		selectedColour = "black";
	}
	svgRectangle.attr("stroke", selectedColour).attr("fill", selectedColour);
}


// Birthline class: A line representing the relationship between this parent
// and this child at the year of birth:
function Birthline(childLifeline, parentLifeline) {
	this.childLifeline = childLifeline;
	this.parentLifeline = parentLifeline;
	this.svgLine = null;
}


// Methods of Birthline class...
Birthline.prototype = {
	draw: function() {
		var birthDate = this.childLifeline.person.birth;
		// FIXME: Particularly nasty code:
		var yPos = this.childLifeline.hostComponent.hostPlot.convertYpos(birthDate);
		if (this.childLifeline !== undefined && this.parentLifeline !== undefined) {
			var childX = this.childLifeline.getXstart();
			var parentX = this.parentLifeline.getXstart();
			var xStart = childX;
			var xEnd = parentX;
			if (childX > parentX) {
				xStart = parentX;
				xEnd = childX;
			}
			
			// FIXME: I want to draw a line but I don't know how :-(
			// FIXME: I want this to be semi-transparent. This works, but not
			// sure if this is the right way (with css etc.):
			this.svgLine = this.childLifeline.hostComponent.hostPlot.svgTarget.append("rect")
									   					   .attr("x", xStart)
														   .attr("y", yPos)
														   .attr("width", xEnd-xStart)
														   .attr("height", 1)
														   .attr("fill-opacity", 0.1);
		}
	}
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

	//console.log("TRACE: Performing breadthFirstSearch from this root person:");
	//console.log(rootPerson);
	
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
	
	return connectedComponent;
}


// FIXME: I have made a mess in these functions in terms of what is a person link
// and which variables are actual person objects. Also, the naming of variables is ambiguous.

function getConnectedComponents(selectedPeople, link2person) {
	//console.log("GETTING CONNECTED COMPONENTS...");
	// Perform breadth-first search to find the connected components...
	var componentGraphs = [];

	var peopleAdded = new Set();

	var selectedPeopleArr = Array.from(selectedPeople);
	
	//console.log("Selected people:");
	//console.log(selectedPeopleArr);
	
	var nPeople = selectedPeopleArr.length;
	for (var personIdx = 0; personIdx < nPeople; personIdx++) {
		currPerson = selectedPeopleArr[personIdx];
		
		if (!(peopleAdded.has(currPerson))) {
			// The person has not been added to a connected component yet
			// => perform (filtered) breadth-first search from it, keeping track
			// of added nodes...
			// NOTE: Only the specified "selected people" will be included in
			// the breadth-first search:
			//console.log("TRACE: peopleAdded:");
			//console.log(peopleAdded);
			var currComponent = breadthFirstSearch(currPerson, peopleAdded, selectedPeople, link2person);
			componentGraphs.push(currComponent);
		}
	}

	//console.log("Component graphs:");
	//console.log(componentGraphs);
	//console.log("Finished getting connected components.");

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
	var specifiedLineages = [link2lineage["/wiki/List_of_Danish_monarchs"]];// Swedish, /wiki/Holy_Roman_Emperor link2lineage["/wiki/List_of_French_monarchs"]];
	var specifiedPeople = [];//[link2person["/wiki/Henry_VIII_of_England"], link2person["/wiki/Frederick_V,_Elector_Palatine"]];

	var peopleArrs = specifiedLineages.map(function (lineage) {return lineage.getPeople()});
	var peopleInLineages = Array.from(new Set(peopleArrs.reduce(function (list1, list2, currentIndex, array) {return list1.concat(list2)})));
	var seedIndividuals = new Set(peopleInLineages.concat(specifiedPeople));

	//console.log("SEED:");
	//console.log(seedIndividuals);
	
	// Retrieve the current depth setting from the interface:
	// XXX

	depth = 2;

	expandedIndividuals = expandIndividuals(Array.from(seedIndividuals), depth, link2person);
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















































