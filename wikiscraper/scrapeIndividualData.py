from optparse import OptionParser
import pdb, sys
import scraper


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
                      default = "Individuals.json",
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

    individuals_list = [line.strip() for line in open(args[0]).readlines()]

    # Scrape data from the specified wikipedia pages:
    outfile = open(options.out, 'w')
    print >> outfile, "{"
    try:
        link2canonical = scraper.scrapeIndividualData(individuals_list, outfile)
    except Exception, e:
        pass
    print >> outfile, "}"
    outfile.close()

#    for link in link2canonical:
#        print link, link2canonical[link]


if __name__ == '__main__':
    sys.exit(main())