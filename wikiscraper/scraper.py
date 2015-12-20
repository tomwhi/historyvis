# -*- coding: utf-8 -*-

'''
Created on Dec 20, 2015

@author: thowhi
'''

import pdb, sys, time, urllib2
import xml.dom.minidom


def extractPersonLinksFromPages(monarch_list_links):
    """Extracts links to monarchs from a list of monarch pages."""

    # Start out an empty set of person wikipedia links:
    output_links = set()

    # For each monarch wikipedia input page...
    for monarch_list_link in monarch_list_links:
        # Try to extract links from this page, and add them to the output set
        # if successful:
        try:
            curr_page_contents = urllib2.urlopen("https://en.wikipedia.org" + monarch_list_link).read()
            curr_page_dom = xml.dom.minidom.parseString(curr_page_contents)
            curr_links = scrapeMonarchListPage(curr_page_dom)
            output_links = output_links.union(curr_links)
        except Exception, e:
            # This page failed for some reason, report the error but then continue:
            print >> sys.stderr, "Extracting links failed for page:", curr_page
            time.sleep(1)

    return output_links


def scrapeMonarchListPage(inputPage):
    """Scrapes monarch links from a single wikipedia monarch list page."""

    pdb.set_trace()
    dummy = 1

#-- Get the DOM for this page as a python object
#-- Get all DOM elements that are tables listing Monarchs for this page:
#--- XXX
#-- For each of those tables:
#--- individualLinks = scrapeTable(table_dom)
#- scrapeTable(table_dom):
#-- Establish an empty set of individual links
#-- Figure out which column of the table is the name (which should also contain the wikipedia href)
#-- For each data row of the table (i.e. rows 2 onwards):
#--- Extract the individual link and add it to the set of individual links
#-- Return the set of individual links

















































