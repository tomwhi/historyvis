#mport sys, time, urllib2
import xml.dom.minidom

name2person = {}

class Person:
    def __init__(self, name, link):
        self.name = name
        self.link = link
        self.mother = None
        self.father = None
    def setMother(self, mother):
        self.mother = mother
    def setFather(self, father):
        self.father = father
    def toString(self):
        return(self.name)

def getParent(currPerson, parentType):
    contents = urllib2.urlopen("https://en.wikipedia.org" + currPerson.link).read()
    dom = xml.dom.minidom.parseString(contents)
    matchingNodes = [node for node in dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == parentType]
    parentNode = matchingNodes[0].nextSibling.nextSibling.childNodes[0]
    if parentNode.nodeName == "#text":
        parentName = parentNode.nodeValue
        parentLink = None
    else:
        assert parentNode.nodeName == "a"
        parentLink = parentNode.attributes['href'].nodeValue
        parentName = parentNode.attributes['title'].nodeValue
    parentPerson = Person(parentName, parentLink)
    return parentPerson

def getAncestry(currPerson, name2person):
    print >> sys.stderr, "Getting ancestry for: " + currPerson.name
    mother = getParent(currPerson, "Mother")
    father = getParent(currPerson, "Father")
    if mother.link != None and not name2person.has_key(mother.name):
        try:
            getAncestry(mother, name2person)
        except Exception, e:
            pass
    if father.link != None and not name2person.has_key(father.name):
        try:
            getAncestry(father, name2person)
        except Exception, e:
            pass
    currPerson.mother = mother
    currPerson.father = father
    name2person[mother.name] = mother
    name2person[father.name] = father


def main():
    # Parse the command-line arguments...
    description = """usage: %prog [options] <monarchWikiPageFile>\n
Inputs:
- File containing wikipedia links to monarch list pages, one per line

Outputs:
- A JSON file containing individuals as Objects, organised as follows:
-- Html link key
-- Value containing:
--- Name and title (as given in the h1 element)
--- Birth year
--- Death year
--- Children, as html links
---- Note: Only include children if they refer to this individual as a parent
--- Mother, as html links
--- Father, as html links
"""

    parser = OptionParser(usage = description)
    parser.add_option("--out", dest = "out",
                      default = "OutputLinks.txt",
                      help = "Name of output file; will be overwritten. " + \
                          "Default=[%default]")
    parser.add_option("--debug", action="store_true", dest="debug",
                      help = "Debug the program using pdb.")
    (options, args) = parser.parse_args()

    # Parse the input parameters...

    if (options.debug):
        pdb.set_trace()

    # Make sure the required input arguments exist:
    if (len(args) != 1):
        print >> sys.stderr, "WRONG # ARGS: ", len(args)
        parser.print_help()
        sys.exit(1)

    monarch_list_filenames = readMonarchListFilenames(open(args[0]))

    # Extract person links from the specified wikipedia pages:
    outfile = open(options.out, 'w')
    output_links = scraper.extractPersonLinksFromPages(monarch_list_filenames)
    for link in output_links:
        print >> outfile, link


if __name__ == '__main__':
    sys.exit(main())



#johnno = Person('John III of Sweden', '/wiki/John_III_of_Sweden')
#getAncestry(johnno, people)

mazza = Person('Marie of France, Countess of Champagne', '/wiki/Marie_of_France,_Countess_of_Champagne')
getAncestry(mazza, name2person)
name2person[mazza.name] = mazza

# This will not work, I have made a horrible mess. :-(

nodesFile = open("PersonNodes.csv", 'w')
edgesFile = open("PersonEdges.csv", 'w')
print >> nodesFile, "ID,Label"
print >> edgesFile, "Source,Target"
for name in name2person:
	person = name2person[name]
	print >> nodesFile, person.toString().replace(" ", "_").replace(",","-").encode("utf8") + "," + person.toString().replace(" ", "_").replace(",","-").encode("utf8")
	if person.mother != None:
		print >> edgesFile, person.toString().replace(" ", "_").replace(",","-").encode("utf8") + "," + person.mother.toString().replace(" ", "_").replace(",","-").encode("utf8")
	if person.father != None:
		print >> edgesFile, person.toString().replace(" ", "_").replace(",","-").encode("utf8") + "," +  person.father.toString().replace(" ", "_").replace(",","-").encode("utf8")

nodesFile.close()
edgesFile.close()
