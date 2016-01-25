// Load the JSON data specifying the nobility data:
d3.json("graph2.json", function(error, graph) {
	if (error) throw error;
	console.log(graph.nodes)

	// Extract names of people from the input:
	// FIXME: Add actual code for doing this here; get the names from the hydrated objects:
	var names = graph.nodes.map(function(obj) {return obj['name'].split("/")[2]})

	// Adapt this template to do the autocompletion when selecting the name of a person:
	$(function() {
		console.log(names)
		$( "#personSelection" ).autocomplete({
			source: names
		});
	});
});
