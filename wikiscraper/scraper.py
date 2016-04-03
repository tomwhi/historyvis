# -*- coding: utf-8 -*-

'''
Created on Dec 20, 2015

@author: thowhi
'''

import gc, pdb, sys, time, urllib2, re
import xml.dom.minidom

def filterDeadLink(link):
    if link.split("&")[-1] == "redlink=1":
        return None
    else:
        return link

def writeVal(link, outfile):
    if link != None:
        outfile.write(link.encode("utf-8"))
    else:
        outfile.write('null')

def toJSON(string):
    if string == None:
        return "null"
    else:
        try:
            return u"\"" + string.decode("utf-8") + u"\""
        except Exception, e:
            pdb.set_trace()
            x = 1

class Reign:
    def __init__(self, reignDomElement, lineage2canonical):
        """Traverse the dom starting from the specified element, to extract
        the reign information. lineage2canonical links from link to canonical
        link for all lineages of interest."""

        # Extract the reign duration from the ensuing node:
        # Note: Seems nasty and hacky, but I think this should work almost always:
        reignDurationXML = reignDomElement.nextSibling.nextSibling.toxml()
        pattern = re.compile("[0-9]{3,}")
        matchYears = re.findall("[0-9]{3,}", reignDurationXML)
        if not len(matchYears) == 2:
            raise ValueError("Invalid reign start and end info:"), reignDurationXML
        self.reignStart = int(matchYears[0])
        self.reignEnd = int(matchYears[1])
        print >> sys.stderr, self.reignStart, self.reignEnd

        # Extract the link from the preceding node:
        lineageLink = reignDomElement.parentNode.previousSibling.previousSibling.getElementsByTagName('a')[0]
        self.link = lineageLink.attributes["href"].nodeValue
        print >> sys.stderr, self.link

    def correctLineageLink(self, link2canonical):
        assert link2canonical.has_key(self.link)
        self.link = link2canonical[self.link]

    def toJSON(self):
        return "\"" + self.link + "\" : [" + str(self.reignStart) + " , " + str(self.reignEnd) + "]"


class Person:
    def __init__(self, link, lineage2canonical):
        time.sleep(0.5)
        page = urllib2.urlopen("https://en.wikipedia.org" + link)
        contents = page.read()
        self.dom = xml.dom.minidom.parseString(contents)

        try:
            self.link = self.extractLink()
        except Exception, e:
            self.link = None
        try:
            self.setName()
        except Exception, e:
            self.name = None
        try:
            self.setMother()
        except Exception, e:
            self.mother = None
        try:
            self.setFather()
        except Exception, e:
            self.father = None
        try:
            self.setChildren()
        except Exception, e:
            self.children = []
        # Only accept valid birth dates; propagate any exceptions:
        self.setBirth()
        if self.birth == None:
            raise ValueError("Invalid birth value.")
        try:
            self.setDeath()
        except Exception, e:
            self.death = None
        try:
            self.setReigns(lineage2canonical)
        except Exception, e:
            self.reigns = {}

        # I don't like this... perhaps refactor later on:
        self.dom = None

    def correctLinks(self, link2canonical):
        if link2canonical.has_key(self.mother):
            self.mother = link2canonical[self.mother]
        else:
            self.mother = None
        if link2canonical.has_key(self.father):
            self.father = link2canonical[self.father]
        else:
            self.father = None
        children = self.children
        self.children = []
        for child in children:
            if link2canonical.has_key(child):
                self.children.append(link2canonical[child])

    def extractLink(self):
        link = [linkNode for linkNode in self.dom.childNodes[1].getElementsByTagName("link") if linkNode.attributes["rel"].nodeValue == "canonical"][0]
        canonicalLinkURL = urllib2.unquote(link.attributes["href"].nodeValue.encode("utf-8"))
        canonicalLink = "/" + "/".join(canonicalLinkURL.split("/")[-2:])
        return canonicalLink

    # Had trouble with dealing with unicode, hence this extra method:
    def writeJSON(self, outfile):
        outfile.write('{"name": "')
        writeVal(self.name, outfile)
        outfile.write('", "mother": "')
        writeVal(self.mother, outfile)
        outfile.write('", "father": "')
        writeVal(self.father, outfile)
        outfile.write('", "children": [')
        if len(self.children) > 0:
            for child in self.children[:-1]:
                outfile.write('"')
                writeVal(child, outfile)
                outfile.write('", ')
            outfile.write('"')
            writeVal(self.children[-1], outfile)
            outfile.write('"')
        outfile.write('], "birth": ')
        writeVal(self.birth, outfile)
        outfile.write(', "death": ')
        writeVal(self.death, outfile)
        outfile.write('}')

    def toJSON(self):
        try:
            outStr = u"{\"name\": "
            outStr += toJSON(self.name)
            outStr += u", \"mother\": "
            outStr += toJSON(self.mother)
            outStr += u", \"father\": "
            outStr += toJSON(self.father)
            outStr += u', "children": ['
            if len(self.children) > 0:
                for child in self.children[:-1]:
                    outStr += toJSON(child)
                    outStr += ', '
                outStr += toJSON(self.children[-1])
            outStr += '], "reigns": {'
            if len(self.reigns.keys()) > 0:
                outStr += ", ".join(map(lambda reign: self.reigns[reign].toJSON(), self.reigns.keys()))
            outStr += '}, "birth": '
            outStr += self.birth
            outStr += ', "death": '
            if self.death != None:
                outStr += self.death
            else:
                outStr += "null"
            outStr += '}'
        except Exception, e:
            pdb.set_trace()
            x = 1
        return outStr.encode("utf-8")

    def setName(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("h1")]
        self.name = matchingNodes[0].childNodes[0].nodeValue.replace('"', '\\"').encode("utf-8")

    # Extract the link and name for the specified parent of this person, by
    # looking at the information in the wikipedia page for the person.
    # Generate a new person from the resulting link and name if the link
    # is null or no person already exists for this link. Otherwise just
    # retrieve the existing person:
    def setMother(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Mother"]
        parentNode = matchingNodes[0].nextSibling.nextSibling.childNodes[0]
        if parentNode.nodeName == "#text":
            # There is no parent link; ignore:
            self.mother = None
        else:
            self.mother = filterDeadLink(parentNode.attributes['href'].nodeValue)

    def setFather(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Father"]
        parentNode = matchingNodes[0].nextSibling.nextSibling.childNodes[0]
        if parentNode.nodeName == "#text":
            # There is no parent link; ignore:
            self.father = None
        else:
            self.father = filterDeadLink(parentNode.attributes['href'].nodeValue)

    def setChildren(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Issue"]
        childNodes = matchingNodes[0].nextSibling.nextSibling.getElementsByTagName("a")
        self.children = filter(lambda link: link != None, map(lambda node: filterDeadLink(node.attributes['href'].nodeValue), childNodes))

    def setBirth(self):
        # Extract birth year information from wikipedia if available, and store it:
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Born"]
        textNodes = filter(lambda node: node.nodeType == 3, matchingNodes[0].nextSibling.nextSibling.childNodes)
        birthInfo = textNodes[0].nodeValue
        span = re.search("[0-9]{3,}", birthInfo).span()
        birthYear = birthInfo[span[0]:span[1]]
        self.birth = birthYear

    def setDeath(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Died"]
        textNodes = filter(lambda node: node.nodeType == 3, matchingNodes[0].nextSibling.nextSibling.childNodes)
        deathInfo = textNodes[0].nodeValue
        span = re.search("[0-9]{3,}", deathInfo).span()
        deathYear = deathInfo[span[0]:span[1]]
        self.death = deathYear

    def setReigns(self, lineage2canonical):
        # Obtain all "Reign" fields:
        matchingNodes = [node for node in self.dom.getElementsByTagName("th") if node.childNodes[0].nodeValue == "Reign"]
        self.reigns = {}
        for reignNode in matchingNodes:
            currReign = Reign(reignNode, lineage2canonical)
            if lineage2canonical.has_key(currReign.link):
                # This reign is in the set of lineages of interest. Correct the link to use the canonical
                # link if necessary, and retain this lineage information:
                currReign.correctLineageLink(lineage2canonical)
                self.reigns[currReign.link] = currReign

    def addChild(self, child):
        self.children.append(child)

    def getMother(self):
        return self.mother

    def getFather(self):
        return self.father

    def getChildren(self):
        return self.children

    def getRelatives(self):
        relatives = self.getChildren()[:]
        if self.getMother() != None:
            relatives.append(self.getMother())
        if self.getFather() != None:
            relatives.append(self.getFather())
        return relatives


#@profile
def scrapeIndividualData(individualLinks, lineage2canonical, limit = None):
    # Create empty set of people (whose wikipedia page I have inspected):
    linksInspected = set()

    # Create stack of links whose wikipedia pages I potentially still need to
    # inspect - starting with the specified links:
    linksToInspect = individualLinks

    link2canonical = {}
    individuals = []

    # Hack: Adding this to facilitate trimming/fixing of assymetrical links
    # following scraping:
    link2person = {}

    # While the stack is not empty...
    while len(linksToInspect) > 0 and (limit < 0 or len(linksInspected) < limit):
        print >> sys.stderr, "Inspected:", len(linksInspected)
        # Get the next individual to inspect:
        currLink = linksToInspect.pop()

        if not currLink in linksInspected:
            print >> sys.stderr, "Inspecting link:", currLink
            try:
                currPerson = Person(currLink, lineage2canonical)

                resolvedLink = currPerson.link
                link2canonical[currLink] = resolvedLink
                # FIX:
                print >> sys.stderr, "#", currLink, resolvedLink

                # "Inspect" them, if they're not already in the links inspected:
                if not resolvedLink in linksInspected:
                    individuals.append(currPerson)
                    linksInspected.add(resolvedLink)

                    # Hack: I *think* this is the data structure I need to fix
                    # links following scraping (i.e. the *resolved* link as key
                    # and the person as value):
                    link2person[resolvedLink] = currPerson

                    for personLink in [currPerson.mother, currPerson.father] + currPerson.children:
                        if not personLink in linksInspected and personLink != None:
                            linksToInspect.append(personLink)

            except Exception, e:
                print >> sys.stderr, "Could not extract person info:", currLink
                #pdb.set_trace()
                #x = 1

    # Correct all the links, to use only canonical links:
    for individual in individuals:
        individual.correctLinks(link2canonical)

    return (individuals, link2person)


def fixLinks(individuals, link2person):
    '''Either trim away inconsistent links or else repair them.'''

    for person in individuals:
        # Check that all links are symmetrical. If one individual links to
        # another and the other doesn't link back, then either trim the
        # link away or instate it, as indicated:

        relativeLinks = person.getRelatives()
        for relativeLink in relativeLinks:
            relative = link2person[relativeLink]
            fixLink(person, relative)


def fixLink(person1, person2):
    '''Check the link between the two people. It should be symmetrical. If not,
    then fix as instructed.'''

    # FIXME: Horrible hacky code, but it should work:
    child = None
    parent = None
    if (person1.mother == person2.link):
        child = person1
        parent = person2
    elif (person1.father == person2.link):
        child = person1
        parent = person2
    elif (person2.mother == person1.link):
        child = person2
        parent = person1
    elif (person2.father == person1.link):
        child = person2
        parent = person1
    elif (person2.link in person1.children):
        child = person2
        parent = person1
    else:
        if not (person1.link in person2.children):
            #pdb.set_trace()
            #dummy = 1
            # FIXME: SOME WEIRD BUG HERE:
            print >> sys.stderr, "APPARENT ERROR:", person1.__dict__, person2.__dict__
        child = person1
        parent = person2

    fixParentChildLink(child, parent)


# NOTE/FIXME: Currently I am forced to trim away assymetrical links rather than
# repairing them, due to the following issue:
# Problem: If the child to parent link is the thing that is broken, then I
# currently have no way of definitely knowing if the parent is the mother or
# the father of the child, based on the information contained in these objects!
# So, I am forced to only implement trimming at this point :-(
# Update: I have now decided to *add* a missing link if only the child->parent
# information is available, and to delete the link if only the parent->child
# information is available.
def fixParentChildLink(child, parent):
    if child.link in parent.children:
        # The child is listed for the parent. If the link is not symmetrical,
        # then remove this link from the parent's list of children:
        if child.mother != parent.link and child.father != parent.link:
            childrenAsSet = set(parent.children)
            print >> sys.stderr, "Trimming parent-child link away. Parent:", parent.link, "Child:", child.link
            childrenAsSet.remove(child.link)
            parent.children = list(childrenAsSet)

    if child.mother == parent.link:
        # The parent is listed as the child's mother. If the link is not
        # symmetrical, then fix by adding the link to the mother:
        if not child.link in parent.children:
            print >> sys.stderr, "Adding parent-child to mother. Mother:", parent.link, "Child:", child.link
            parent.addChild(child.link)

    if child.father == parent.link:
        # The parent is listed as the child's father. If the link is not
        # symmetrical, then fix by adding the link to the mother:
        if not child.link in parent.children:
            print >> sys.stderr, "Adding parent-child to father. Father:", parent.link, "Child:", child.link
            parent.addChild(child.link)


def extractPersonLinksFromPages(monarch_list_links, sleep_time = 1):
    """Extracts links to monarchs from a list of monarch pages."""

    # Start out an empty set of person wikipedia links:
    output_links = set()

    # For each monarch wikipedia input page...
    for monarch_list_link in monarch_list_links:
        print >> sys.stderr, "Extracting links from page:", monarch_list_link
        # Try to extract links from this page, and add them to the output set
        # if successful:
        try:
            curr_page_contents = urllib2.urlopen(monarch_list_link).read()
            curr_page_dom = xml.dom.minidom.parseString(curr_page_contents)
            curr_links = scrapeMonarchListPage(curr_page_dom)
            output_links = output_links.union(curr_links)
            print >> sys.stderr, len(output_links)
        except Exception, e:
            # This page failed for some reason, report the error but then continue:
            print >> sys.stderr, "Extracting links failed for page:", monarch_list_link
            print >> sys.stderr, e
        time.sleep(1)

    return output_links


def getTableElements(dom):
    """Returns a list of table dom elements extracted from the body of the
    specified DOM."""

    table_elems = [node for node in dom.getElementsByTagName("table")]
    return table_elems


def scrapeMonarchsFromTable(table):
    # Establish an empty set of individual links:
    monarch_links = set()

    # Extract the rows from the table:
    row_elems = table.getElementsByTagName("tr")

    # Determine if there is a "Name" column, and if so, what number field
    # it is in:
    header_elems = row_elems[0].getElementsByTagName("th")
    name_idx = None
    for header_idx in range(len(header_elems)):
        curr_node_value = header_elems[header_idx].childNodes[0].nodeValue
        if curr_node_value == "Name":
            name_idx = header_idx

    # For each data row of the table (i.e. rows 2 onwards):
    # - Extract the individual link and add it to the set of individual links
    if name_idx >= 0:
        # There are monarchs in this table; get their links:
        for row in row_elems[1:]:
            row_cells = row.getElementsByTagName("td")
            name_cell = row_cells[name_idx]
            # FIXME: Problem: The "Name" cell can sometimes contain href links
            # that are not to the people. Need to figure out how to filter these
            # out.
            links_in_cell = name_cell.getElementsByTagName("a")
            first_link = links_in_cell[0]
            link_value = first_link.attributes['href'].value
            monarch_links.add(link_value)

    return monarch_links


def scrapeMonarchListPage(dom):
    """Scrapes monarch links from a single wikipedia monarch list page."""

    # Get all DOM elements that are tables (thus potentially listing
    # monarchs):
    dom_tables = getTableElements(dom)

    monarch_links = set()

    # For each of those tables...
    for table in dom_tables:
        # Scrape links from this table if it contains them:
        try:
            curr_links = scrapeMonarchsFromTable(table)
            monarch_links = monarch_links.union(curr_links)
        except Exception, e:
            print >> sys.stderr, "Failed to scrape table, skipping."

    return monarch_links

















































