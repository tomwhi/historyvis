// Person class:
function Person(link, name, birth, death) {
	this.link = link;
	this.name = name;
	this.birth = birth;
	this.death = death;
	this.mother = null;
	this.father = null;
	this.children = [];
}

Person.prototype = {
	setMother: function(mother) {
		this.mother = mother
	},
	
	setFather: function(father) {
		this.father = father
	},

	addChild: function(child) {
		this.children.push(child);
	}
}

// Load the JSON data specifying the nobility data:
d3.json("Test.json", function(error, jsonObj) {
	if (error) throw error;
	console.log(jsonObj)

	// Extract names of people from the input:
	// FIXME: Add actual code for doing this here; get the names from the hydrated objects:
	var names = Object.keys(jsonObj).map(function(obj) {return obj.split("/")[2]})

	// Adapt this template to do the autocompletion when selecting the name of a person:
	$(function() {
		console.log(names)
		$( "#personSelection" ).autocomplete({
			source: names
		});
	});
	

	hydratePersonData(jsonObj)
	// Perhaps I need to create or select the canvas element here, to be specified as a parameter to displayLifelines and updateLifelines?
	//updateLifelines()
	//interface.onClick = updateLifelines()
});

// NOTE: This function might introduce performance problems; need to test.
// Also, could be refactored.
function extractLink2Person(jsonObj) {
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
			var currReign = new Reign(currLineage, reignInfo[currReignLink][0], reignInfo[currReignLink][1]);
			
			currPerson.addReign(currReign);
			
			// XXX NEXT: IMPLEMENT THE ABOVE CLASSES, CONSTRUCTORS, AND METHODS, AND THEN TEST.
		}
	}

	console.log(link2person);

	//Object.keys(jsonObj).map(function(link) {return link})
	
	// XXX CONTINUE HERE: SET ALL MOTHER, FATHER AND CHILD FIELDS FOR EACH PERSON BY GOING THROUGH
	// BOTH THE LINK2PERSON AND JSONOBJ OBJECTS:
	// XXX
}

//# NOTE: Return lineage key 2 lineage object dictionary too
function hydratePersonData (jsonObj) {
	// Generate link2person from json:
	var link2person = extractLink2Person(jsonObj);
	
	//fill in mother, father, and children links from input dictionary ???
	//also make reign objects and lineage objects when new keys are found
	//add people to lineage2people dict too
}

















































