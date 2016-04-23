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

	getParents: function() {
		var parents = [];
		if(!(typeof this.mother === 'undefined')){
	    	parents.push(this.mother);
		};
		if(!(typeof this.father === 'undefined')){
	    	parents.push(this.father);
		};
		return parents;
	},

	getChildren: function() {
		return this.children;
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
			lastDeathDate = currPersonObj.death;
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


