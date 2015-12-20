'''
Created on Dec 1, 2015

@author: thowhi
'''

import json, pdb, sys
from optparse import OptionParser
import scraper


def readMonarchListFilenames(list_file):
    return [line.strip() for line in list_file.readlines()]


def main():
    # Parse the command-line arguments...
    description = """usage: %prog [options] <monarchWikiPageFile>\n
Inputs:
- File containing wikipedia links to monarch list pages, one per line

Outputs:
- A set of wikipedia links containing individuals on those pages, to specified output file
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
























































