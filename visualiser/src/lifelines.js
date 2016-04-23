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
	
	// XXX CONTINUE HERE: INVESTIGATE ALTERNATIVE ALGORITHMS + DEBUGGING
	// VISUALISATION.
	
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
export class LifelinePlotComponent {
	constructor(peopleLinks, hostPlot) {
		this.peopleLinks = peopleLinks;
		this.hostPlot = hostPlot;

		// FIXME: Not sure about this: I believe I am duplicating data here, as I
		// have a link to the person objects directly, and also via their lifeline
		// objects:
		this.link2lifeline = {};
	}

	// Generates a Lifeline object for each person. Also, generates relevant
	// parent-child links, as Birthline objects:
	generateLifelines() {
		for (var personIdx = 0; personIdx < this.peopleLinks.length; personIdx++) {
			var currPersonLink = this.peopleLinks[personIdx];
			var currPerson = this.hostPlot.link2person[currPersonLink];

			var currLifeline = new Lifeline(currPerson, this);
			this.link2lifeline[currPersonLink] = currLifeline;
		}
	}

	// Generates Birthline objects for all Lifeline objects:
	generateBirthlines() {
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
	}
	
	// Adjust the x position of every lifeline in this component, adding
	// the specified amount...
	adjustOverallPosition(adjustment) {
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			currLifeline.gridPosition += adjustment;
		}
	}
	
	evaluatePositions(evaluationStack) {
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
				var proposedPos = currGridPos - 1;
				if (motherLifeline.gridPosition === null) {
					motherLifeline.gridPosition = proposedPos;
					evaluationStack.push(motherLifeline);
				} else if (proposedPos != motherLifeline.gridPosition) {
					console.log("Conflicting position for mother.");
				}
			}
		}
		
		// Add father at X+1 if lifeline is existing and not already specified:
		if (father !== undefined) {
			var fatherLifeline = this.link2lifeline[father.link];
			if (fatherLifeline !== undefined) {
				var proposedPos = currGridPos + 1;
				if (fatherLifeline.gridPosition === null) {
					fatherLifeline.gridPosition = proposedPos;
					evaluationStack.push(fatherLifeline);
				} else if (proposedPos != fatherLifeline.gridPosition) {
					console.log("Conflicting position for father.");
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
				var proposedPosition = currGridPos - 1;
				if (currChild.mother === person) {
					proposedPosition = currGridPos + 1;
				}
				if (currChildLifeline.gridPosition === null) {
					currChildLifeline.gridPosition = proposedPosition;
					evaluationStack.push(currChildLifeline);
				} else {
					if (proposedPos != currChildLifeline.gridPosition) {
						console.log("Conflicting position for child.");
					} else {
						console.log("Child position was consistent.");
					}
				}
			}
		}
	}

	assignStartingPositions(focalLifeline) {
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
	}

	getLifelinesAtPos(currGridPos) {
		var lifelinesAtPos = [];
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			var lifelineGridPos = currLifeline.gridPosition;
			if (currGridPos == lifelineGridPos) {
				lifelinesAtPos.push(currLifeline);
			}
		}
		return lifelinesAtPos;
	}

	adjustPositionsForOverlap() {
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
				adjustGridPositions(currCluster, -0.3, 0.3);
			}
			
			currGridPos++;
		}
	}

	getMinGridPos()) {
		var minPos = Infinity;
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			if (currLifeline.gridPosition < minPos) {
				minPos = currLifeline.gridPosition;
			}
		}		
		return minPos;
	}

	getMaxGridPos() {
		var maxPos = -Infinity;
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			if (currLifeline.gridPosition > maxPos) {
				maxPos = currLifeline.gridPosition;
			}
		}
		return maxPos;
	}

	// Calculate the width of this component in grid units:
	getWidth() {
		var maxGridPos = this.getMaxGridPos();
		var minGridPos = this.getMinGridPos();
        return maxGridPos - minGridPos;
	}

	// Assign relative positions to Lifeline objects in this lifeline
	// plot component:
	// FIXME/NOTE: This is where an algorithm could be specified as an
	// argument.
	assignRelativePositions() {
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
	}
	
	selectFocalPerson() {
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
		
		if (Array.from(peopleInLineagesLinks).length == 0) {
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
	}
	
	draw() {
		// Draw this lifeline plot component on the host svg element...
		
		for (var link in this.link2lifeline) {
			var currLifeline = this.link2lifeline[link];
			currLifeline.draw();
		}
	}
}


// A plot of a set of lifeline bars:
export class LifelinePlot {
	constructor(svgTarget, selectedPeople, selectedLineages, link2person) {
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

	calculateBoundaryYears() {
		// Calibrate the canvas start and end year based on the earliest birth
		// and last death dates:
		this.startYear = getFirstBirth(this.peopleToPlot, this.link2person);
		this.endYear = getEndDeath(this.peopleToPlot, this.link2person);
		
		//console.log("TRACE: Years for plot:");
		//console.log(this.startYear);
		//console.log(this.endYear);
	}
	
	getYearCoord(year) {
		// FIXME: This has got to be wrong:
		var svgHeight = this.svgTarget[0][0].clientHeight;
			
		// Translate a year to a y position on the plot canvas:
		var fractionOfHeight = (year - this.startYear)/(this.endYear - this.startYear);
		var yPos = fractionOfHeight*svgHeight; // XXX I think this will work; but PROBLEM: Doesn't consider margins that I might wish to include around the plot itself.
		return yPos;
	}

	getSvgWidth() {
		// FIXME: This has got to be wrong:
		return this.svgTarget[0][0].clientWidth;
	}
	
	// Hacky method to convert x postion as a fraction of width to
	// an actual x coordinate on the svg element, taking the margin width
	// into consideration:
	fraction2position(fractionOfWidth) {
		var marginWidth = this.marginFraction * this.getSvgWidth();
		var plotWidth = (1 - (this.marginFraction * 2)) * this.getSvgWidth();
		var extraDist = fractionOfWidth * plotWidth;
		return marginWidth + extraDist;
	}
	
	convertXpos(gridPos) {
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
	}

	getMinGridPos() {
		return this.plotComponents[0].getMinGridPos();
	}

	getMaxGridPos() {
		var lastComponent = this.plotComponents[this.plotComponents.length - 1];
		return lastComponent.getMaxGridPos();
	}

	getGridWidth() {
		return this.getMaxGridPos() - this.getMinGridPos();
	}

	convertYpos(yPos) {
		// XXX FIXME: Adjust to include margin:
		return this.getYearCoord(yPos);
	}

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
		
		// Gap size to add between components:
		var componentGap = 1;
		
		var cumulativeWidth = 0;
		for (var compIdx = 0; compIdx < this.plotComponents.length; compIdx++) {
			var currComponent = this.plotComponents[compIdx];
			
			var currComponentWidth = currComponent.getWidth();
			
			currComponent.adjustOverallPosition(cumulativeWidth + leftShift);
						
			cumulativeWidth = cumulativeWidth + currComponentWidth + componentGap;
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
export class Lifeline {
	constructor(person, hostComponent) {
		this.person = person;
		this.hostComponent = hostComponent;
	
		// Parent/Child birth lines for this individual (as a child):
		this.motherBirthline = null;
		this.fatherBirthline = null;
	
		this.gridPosition = null; // A grid position on the plot.

		this.svgRectangle = null;
	
		// Bars indicating periods as a reigning monarch:
		this.reignBars = [];
	
		// XXX Should the lifeline have a set of links to child lifelines? Should it have a mother and father link?
	}

	getXstart() {
		return this.hostComponent.hostPlot.convertXpos(this.gridPosition);
	}
	
	getYstart() {
		return this.hostComponent.hostPlot.convertYpos(this.person.birth);
	}

	getYend() {
		return this.hostComponent.hostPlot.convertYpos(this.person.getDeath());
	}
	
	draw() {
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
		
		// Draw reigns for this lifeline:
		this.drawReigns();
	}

	drawReigns() {
		// FIXME: Perhaps need to think about how to do this a bit more.
		var lineagesToShowLinks = new Set(this.hostComponent.hostPlot.lineagesToShow.map(function(x) {return x.link}));

		// Draw each reign of this individual for any of those lineages...
		for (var reignIdx = 0; reignIdx < this.person.reigns.length; reignIdx++) {
			var currReign = this.person.reigns[reignIdx];
			var currLineageLink = currReign.lineage.link;
			if (lineagesToShowLinks.has(currLineageLink)) {
				// We should draw this Reign object. Currently, just draw a
				// rectangle. FIXME: Revisit this:
				var yStart = this.hostComponent.hostPlot.convertYpos(currReign.start);
				var yEnd = this.hostComponent.hostPlot.convertYpos(currReign.end);
				var xStart = this.getXstart();
				var boxWidth = this.hostComponent.hostPlot.boxWidth;
				reignRectangle = this.hostComponent.hostPlot.svgTarget.append("rect")
								   					   .attr("x", xStart)
													   .attr("y", yStart)
													   .attr("width", boxWidth)
													   .attr("height", yEnd-yStart)
													   .attr("fill", "yellow")
													   .attr("stroke", "yellow");
				this.reignBars.push(reignRectangle);
			}
		}
	}
	
	select(depth) {
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


// XXXYYY INTRODUCE A REIGN-BAR CLASS, AND MOVE CODE FOR DRAWING REIGNS IN IT'S RENDER FUNCTION.


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
export class Birthline {
	constructor(childLifeline, parentLifeline) {
		this.childLifeline = childLifeline;
		this.parentLifeline = parentLifeline;
		this.svgLine = null;
	}

	draw() {
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
class ConnectedComponent {
	constructor() {
		this.nodes = [];
	}

	addNode(node) {
		this.nodes.push(node);
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














































