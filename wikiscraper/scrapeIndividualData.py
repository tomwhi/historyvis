from optparse import OptionParser
import json, pdb, sys, urllib
import scraper
import codecs


def main():
    # Parse the command-line arguments...
    description = """usage: %prog [options] <individuals> <lineage2canonical>\n
Inputs:
- File containing wikipedia links to individuals, one per line
- JSON file containing mappings from lineage wiki link to canonical lineage
wiki link

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
    parser.add_option("--limit", dest = "limit",
                      default = -1,
                      help = "Limit of individuals scraped. " + \
                          "Default=[%default]")
    parser.add_option("--debug", action="store_true", dest="debug",
                      help = "Debug the program using pdb.")
    (options, args) = parser.parse_args()

    # Parse the input parameters...

    if (options.debug):
        pdb.set_trace()

    # Make sure the required input arguments exist:
    if (len(args) != 2):
        print >> sys.stderr, "WRONG # ARGS: ", len(args)
        parser.print_help()
        sys.exit(1)

    individuals_list = [line.strip() for line in open(args[0]).readlines()]

    lineage2canonical = json.load(open(args[1]))

    # Scrape data from the specified wikipedia pages:
    outfile = codecs.open(options.out, 'w', "utf-8")
    print >> outfile, u"{"
    print >> sys.stderr, "Scraping data..."
    (individuals, link2person) = scraper.scrapeIndividualData(individuals_list, lineage2canonical, limit=int(options.limit))

    # Impose a filter on the links on the individuals data, either filtering
    # asymmetrical links, or fixing them...
    scraper.fixLinks(individuals, link2person)

    individualStrs = []
    for individual in individuals:
        try:
            currStr = '"' + individual.link + "\" : "
            currStr += individual.toJSON() + ""
        except Exception, e:
            pdb.set_trace()
        individualStrs.append(currStr)
    outString = ",\n".join(individualStrs)
    # Note: I had some trouble figuring out UTF-8 encoding / decoding. This seems
    # to work now:
    print >> outfile, outString.decode("utf-8")
#    for individual in individuals:
#        # XXX FIX HERE: Unicode decoding encoding is not working. Don't really understand this.
#        #.decode('utf-8').encode("utf-8")
#        outfile.write('"')
#        outfile.write(individual.link)
#        outfile.write('" : ')
#        individual.writeJSON(outfile)
#        print >> outfile, ","
#        outfile.flush()

    print >> sys.stderr, "Scraped data..."
    print >> outfile, u"}"
    outfile.close()

#    for link in link2canonical:
#        print link, link2canonical[link]


if __name__ == '__main__':
    sys.exit(main())