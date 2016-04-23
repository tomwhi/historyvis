import json
import numpy
import cPickle, pdb, sys
from flask import Flask

def computeAncestry():
    x = json.load(open("../visualiser/Test.json"))
    peopleLinks = x.keys()
    # Index in adjacency matrix corresponds to index in the above list. Set up dictionary
    # to facilitate retrieval of index based on string link:
    link2idx = {}
    idx = 0
    while idx < len(peopleLinks):
        link = peopleLinks[idx]
        link2idx[link] = idx
        idx += 1

    # Paths will be stored as follows:
    # ith row, jth column indicates the path (if any) for ancestry from person
    # i to person j. It is represented as a single integer k indicating the
    # linking person that provides the shortest ancestry path from i to j.
    # If i = k then this indicates that the path is direct from i to j.
    pathsMatrix = numpy.zeros((len(peopleLinks), len(peopleLinks)), dtype=numpy.int16) - 1

    personIdx2parentIdxs = [None]*len(peopleLinks)

    # List of lists showing computed ancestors for each individual:
    personIdx2ancestors = [None]*len(peopleLinks)

    for person in peopleLinks:
        idx = link2idx[person]
        mother = x[person]["mother"]
        father = x[person]["father"]
        personIdx2parentIdxs[idx] = []
        # Hack: Each individual is considered their own ancestor for purposes below:
        personIdx2ancestors[idx] = set([idx])
        if not mother == None:
            motherIdx = link2idx[mother]
            personIdx2parentIdxs[idx].append(motherIdx)
            personIdx2ancestors[idx].add(motherIdx)
            pathsMatrix[motherIdx,idx] = motherIdx
        if not father == None:
            fatherIdx = link2idx[father]
            personIdx2parentIdxs[idx].append(fatherIdx)
            personIdx2ancestors[idx].add(fatherIdx)
            pathsMatrix[fatherIdx,idx] = fatherIdx

    # DP algorithm...
    ancestryDepth = 1

    # XXX NOT SURE WHAT TO SET THE LOOP LIMIT TO. Conceptually, it should be the
    # maximum generation depth, but not sure how/where to calculate this:
    while ancestryDepth < 20:
        print >> sys.stderr, ancestryDepth
        # Update each individual's paths...
        personIdx = 0
        person = peopleLinks[personIdx]
        currTotalAncestors = 0
        while personIdx < len(peopleLinks):
            # Get the parents for this person:
            parentIdxs = personIdx2parentIdxs[personIdx]
            # Note: Can rank mother or father higher than the other in
            # computing ancestry here by altering this code.
            # Get all indexes that have shortest ancestry paths to either of those parents:
            for parentIdx in parentIdxs:
                computedAncestors = personIdx2ancestors[parentIdx]
                currTotalAncestors += len(computedAncestors)
                # Consider each of those ancestors...
                for ancestor in computedAncestors:
                    # If there is no link from the current person to this ancestor, then
                    # specify that the shortest link is via this parent:
                    if pathsMatrix[ancestor, personIdx] == -1:
                        pathsMatrix[ancestor, personIdx] = parentIdx
                        personIdx2ancestors[personIdx].add(ancestor)
            personIdx += 1
        ancestryDepth += 1
        print >> sys.stderr, currTotalAncestors

    numpy.save(open("AncestryPaths.npy", 'w'), pathsMatrix)
    cPickle.dump(personIdx2ancestors, open("personIdx2ancestors.txt", 'w'))
    cPickle.dump(peopleLinks, open("peopleLinks.txt", 'w'))
    cPickle.dump(link2idx, open("link2idx.txt", 'w'))

def loadResources():
    return (json.load(open("../visualiser/Test.json")), numpy.load(open("AncestryPaths.npy")), cPickle.load(open("personIdx2ancestors.txt")), cPickle.load(open("peopleLinks.txt")), cPickle.load(open("link2idx.txt")))

def getAncestryPath(person, ancestor, pathsMatrix, peopleLinks):
    personIdx = link2idx[person]
    ancestorIdx = link2idx[ancestor]
    currConnector = pathsMatrix[ancestorIdx, personIdx]
    ancestrySequence = []
    if currConnector == -1:
        return ancestrySequence
    while currConnector != ancestorIdx:
        ancestrySequence.append(peopleLinks[currConnector])
        currConnector = pathsMatrix[ancestorIdx, currConnector]
    ancestrySequence.append(peopleLinks[currConnector])
    return ancestrySequence

def cmpAge(person1, person2):
    if person1["birth"] < person2["birth"]:
        return -1
    elif person1["birth"] == person2["birth"]:
        return 0
    else:
        return 1

def getSharedAncestry(person1, person2, pathsMatrix, peopleLinks, personIdx2ancestors, peopleDict):
    person1idx = link2idx[person1]
    person2idx = link2idx[person2]
    # Get shared ancestors (which can include one of those people):
    sharedAncestors = personIdx2ancestors[person1idx].intersection(personIdx2ancestors[person2idx])
    # Get the most recent ancestor:
    ancestorObjs = map(lambda idx: (idx, peopleDict[peopleLinks[idx]]), sharedAncestors)
    if len(ancestorObjs) == 0:
        return None
    else:
        mostRecent = ancestorObjs[0]
        mostRecentBirth = mostRecent[1]["birth"]
        for tup in ancestorObjs:
            if tup[1]["birth"] > mostRecentBirth:
                mostRecentBirth = tup[1]["birth"]
                mostRecent = tup
    # Truly ghastly code:
    return (getAncestryPath(person1, peopleLinks[mostRecent[0]], pathsMatrix, peopleLinks),
            getAncestryPath(person2, peopleLinks[mostRecent[0]], pathsMatrix, peopleLinks))

app = Flask(__name__)
(peopleDict, pathsMatrix, personIdx2ancestors, peopleLinks, link2idx) = loadResources()

@app.route("/getSharedAncestry/<inputString>")
def getSharedAncestryWeb(inputString):
    person1str = inputString.split("%")[0]
    person2str = inputString.split("%")[1]
    person1link = "/wiki/" + person1str
    person2link = "/wiki/" + person2str
    (sequence1, sequence2) = getSharedAncestry(person1link, person2link, pathsMatrix, peopleLinks, personIdx2ancestors, peopleDict)
    return " ".join(sequence1) + "<p><p><p>" + " ".join(sequence2)

if __name__ == "__main__":
    app.debug = True
    app.run()

print >> sys.stderr, getSharedAncestry("/wiki/Louis_XIII_of_France", '/wiki/John_III_of_Navarre', pathsMatrix, peopleLinks, personIdx2ancestors)
print >> sys.stderr, getSharedAncestry("/wiki/Louis_XIII_of_France", '/wiki/Louis,_Duke_of_Guyenne', pathsMatrix, peopleLinks, personIdx2ancestors)
print >> sys.stderr, getSharedAncestry("/wiki/Gustaf_VI_Adolf_of_Sweden", '/wiki/Elizabeth_II', pathsMatrix, peopleLinks, personIdx2ancestors)

#getAncestryPath("/wiki/Christian_August_of_Holstein-Gottorp,_Prince_of_Eutin", '/wiki/Joachim_III_Frederick,_Elector_of_Brandenburg', pathsMatrix, peopleLinks)
#getAncestryPath("/wiki/Gustaf_VI_Adolf_of_Sweden", '/wiki/Gustav_I_of_Sweden', pathsMatrix, peopleLinks)
# I THINK IT'S WORKING. NEXT: STORE THIS MATRIX TO AN OUTPUT FILE THAT CAN THEN BE READ.

#getAncestryPath("/wiki/Gustaf_VI_Adolf_of_Sweden", '/wiki/Joachim_III_Frederick,_Elector_of_Brandenburg', pathsMatrix, peopleLinks)



































