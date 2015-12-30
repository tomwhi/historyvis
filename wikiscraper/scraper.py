# -*- coding: utf-8 -*-

'''
Created on Dec 20, 2015

@author: thowhi
'''

import pdb, sys, time, urllib2
import xml.dom.minidom


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

















































