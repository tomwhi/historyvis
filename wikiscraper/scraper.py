# -*- coding: utf-8 -*-

'''
Created on Dec 20, 2015

@author: thowhi
'''

import pdb, sys, time, urllib2, re
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

class Person:
    def __init__(self, link):
        time.sleep(0.1)
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
        try:
            self.setBirth()
        except Exception, e:
            self.birth = None
        try:
            self.setDeath()
        except Exception, e:
            self.death = None

    def extractLink(self):
        link = [linkNode for linkNode in self.dom.childNodes[1].getElementsByTagName("link") if linkNode.attributes["rel"].nodeValue == "canonical"][0]
        canonicalLinkURL = link.attributes["href"].nodeValue
        canonicalLink = "/" + "/".join(canonicalLinkURL.split("/")[-2:])
        return canonicalLink

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

    def setName(self):
        matchingNodes = [node for node in self.dom.getElementsByTagName("h1")]
        self.name = matchingNodes[0].childNodes[0].nodeValue.replace('"', '\\"')

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

    def addChild(self, child):
        self.children.append(child)


def scrapeIndividualData(individualLinks, outfile):
    # Create empty set of people (whose wikipedia page I have inspected):
    linksInspected = set()

    # Create stack of links forwhose wikipedia pages I potentially still need to
    # inspect - starting with the specified links:
    linksToInspect = individualLinks

    link2canonical = {}

    # While the stack is not empty...
    while len(linksToInspect) > 0:
        # Get the next individual to inspect:
        currLink = linksToInspect.pop()

        if not currLink in linksInspected:
            print >> sys.stderr, "Inspecting link:", currLink
            try:
                currPerson = Person(currLink)
                resolvedLink = currPerson.link
                link2canonical[currLink] = resolvedLink
                # FIX:
                print >> sys.stderr, "#", currLink, resolvedLink

                # "Inspect" them, if they're not already in the links inspected:
                if not resolvedLink in linksInspected:
                    linksInspected.add(resolvedLink)

                    # XXX FIX HERE: Unicode decoding encoding is not working. Don't really understand this.
                    #.decode('utf-8').encode("utf-8")
                    outfile.write('"')
                    outfile.write(currLink)
                    outfile.write('" : ')
                    currPerson.writeJSON(outfile)
                    print >> outfile, ","
                    outfile.flush()

                    for personLink in [currPerson.mother, currPerson.father] + currPerson.children:
                        if not personLink in linksInspected and personLink != None:
                            linksToInspect.append(personLink)
            except Exception, e:
                print >> sys.stderr, "Could not extract person info:", currLink
                pdb.set_trace()
                x = 1

    return link2canonical


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
        except Exception, e:
            print >> sys.stderr, "Failed to scrape table, skipping."

        monarch_links = monarch_links.union(curr_links)

    return monarch_links

















































