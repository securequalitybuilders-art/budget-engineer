// Curated browser-safe corpus for the in-app KPI2 researcher node.
//
// This module adds the two genuinely-real, small, high-value Zimbabwe/SADC
// source documents from the `corpus/` library (the rest of that directory is
// Node-only: dead OCR scans, wrong-content files, or multi-MB textbooks that
// are impractical to bundle). Both texts are cleaned (page markers stripped)
// and run through the same `parseCodeDocument` ingestion path as the compact
// statutes in `codeCorpus.ts`, so the agent's `search-codes` tool can retrieve
// them fully offline in the browser build.
//
// - SAZ Standards Development Update (Jul-Dec 2022): real ZWS standard
//   references (cement, concrete masonry units, aggregates, roofing tiles,
//   steel fencing, precast paving, interlocking blocks, etc.).
// - Building Typologies Design Guide: spatial programming and dimensional
//   standards across the five sequential design layers.

import type { CodeDocument } from './types'
import { parseCodeDocument } from './extraction'

export const SAZ_CATALOGUE_TEXT: string = `1
SAZ Standards Development Update July –December 2022
7
ZWS 1057:202
ZIMBABWE STANDARDS FOR
Manned security services – cash and valuables in transit services
(Collection and Delivery)
\\
Contents Page
Introduction 2
How SAZ Standards are developed 3
How to use this publication 3
Section 1: Standards Projects in progress 6
Section 2: Standards published during the 24
preceding month
Section 3: Standards reprinted during the 27
preceding six months
Section 4: Amendments published during 27
the preceding six months
Standards Association of Zimbabwe
Postal Address : P.O Box 2259
Harare
Zimbabwe
Physical Address : Northend Close
Northridge Park
Borrowdale
Harare
Zimbabwe
Tel : 263-242-82021/8/9
263-242-885511/2
Fax : 263-242-882020
Email : info@saz.org.zw
Website : www.saz.org.zw

2
SAZ Standards Development Update July –December 2022
INTRODUCTION
The Standards Association of Zimbabwe (SAZ) is the National Standards Body of Zimbabwe.
The SAZ depends on the work of its technical committees (TC), whose members give their time and effort
without pay or reward, to develop generally acceptable national standards. The basic principles are; that SAZ
carries out its task in the national interest, takes account of all significant viewpoints, secures appropriate
representation at all technical committee levels and has an authoritative body of opinion behind every ZWS
Standard. Regional, Continental or Internationals are adopted only if they are found applicable to the Zimbabwe
situation.
SAZ also adopts regional harmonized texts as required by the regional trade protocol. This work programme is
published as fulfillment of the national standards body’s obligation to publish a work programme of standards
currently under preparation and standards, which it has adopted under the WTO/TBT Agreement Annex 3 Code
of Good Practice for the Preparation, Adoption and Application of Standards (Clause J). It is published twice a
year.
HOW SAZ STANDARDS ARE DEVELOPED
SAZ Standards are developed on the basis of a project approach consisting of the following stages:
a) Proposal stage
b) Preparatory stage
c) Committee stage
d) Draft for public comment stage and
e) Publication stage
During the development of Zimbabwe Standards, drafts are circulated to Technical Committee and or
Subcommittee members for perusal and comment. Differences of view on technical content of a standard are
resolved through consensus. The technical committee ultimately produces a final draft which is then circulated
for comment, not only to technical committee members but also to Standards Approval Committee members,
other national standards bodies and any other organizations and persons who have indicated an interest in the
project. Final drafts are also posted on website and workshopped as necessary. This procedure is designed to
ensure that the published standard is acceptable to as many interested groups as possible.
The SAZ Standards Development Update contains a list of all the standards projects that are in progress and a
list of national Standards and amendments published during the previous six-month period. The SAZ Standards
Development Update is published twice a year, in January and July.

3
SAZ Standards Development Update July –December 2022
HOW TO USE THIS PUBLICATION
1. Standards Projects in Progress
1.1 Reference No.
The reference number of the project is given in the left hand column 1. The number consists of:
a) The initials of the Industry Sector under which the project falls e.g. BC Building and
Civil Engineering Sector.
b) The technical committee number.
c) "D" stands for draft.
d) The number of the standard once published
e.g. BC 002 - D 528
A list of SAZ technical committees is contained in the SAZ TC Catalogue available from the Standards
Development Division at the SAZ.
Projects are grouped in order of the Industry Sectors.
1.2 Title
Column 2 contains the title of each proposed standard.
1.3 Stage
Column 3 indicates the principle stages involved. A project is indicated as having reached a particular
stage when action or decision indicated at that stage has been taken.
Where ISO/ TC drafts are being reviewed and voted on by SAZ's National mirror committees, the
stage of the ISO drafts is indicated as follows:
ISO/WD
ISO/CD
ISO/DIS
ISO/FDIS
ISO/DTR
ISO Working document
ISO Committee draft
ISO Draft Reginal, Continental or
International
ISO Final draft Reginal, Continental or
International ISO Draft technical report

4
SAZ Standards Development Update July –December 2022
1.4 International Classification for Standards (ICS)
Column 4 lists the ICS number(s) under which the subject matter is classified.
1.5 Edition
Column 5 indicates the edition of the standard currently being developed under this project.
1.6 Relationship with Regional Standard(RS), Continental Standard(CS) or International Standard
(IS)
The last column indicates the relationship of the proposed standard to a Regional Standard
(RS), Continental Standard (CS) or International Standard (IS). The following abbreviations
have been used:
IDT An identical standard: a standard identical in every detail with a
corresponding RS,CS or IS. The vice versa principle is fulfilled.
M Modified: National standard is modified in relation to the RS,CS or IS.
Modifications are identified in the national prefix. The vice versa principle is
not fulfilled.
NEQ Not equivalent: a national standard not equivalent to the Regional Standard
(RS), Continental Standard (CS) or International Standard (IS). in technical
content or presentation.
2. Standards Published
2.1 Reference No.
The reference number in the left hand column 1 is the number of the ZWS Standard and is in
numerical order.
2.2 Issue
Column 2 indicates the year in which the standard was published. For adopted Regional
Standard (RS), Continental Standard (CS) or International Standard (IS), the issue refers to
year in which the Regional Standard (RS), Continental Standard (CS) or International Standard
(IS) was adopted by SAZ.
2.3 Project Number
Column 3 indicates the reference number of the project under which the standard was
developed. (Refer to 1.1).
2.4 Title
Column 4 contains the title of the published standard.
2.5 International Classification for Standards (ICS)
Column 5 indicates the ICS number(s) under which the subject matter is classified.
2.6 Edition
Column 6 indicates the edition of the approved standard.

5
SAZ Standards Development Update July –December 2022
2.7 Relationship with Regional Standard (RS), Continental Standard (CS) or International Standard
(IS)
The last column indicates the relationship of the published standard to Regional Standard (RS),
Continental Standard (CS) or International Standard (IS). Refer to 1.6 for abbreviations used:
3. Standards Reprinted
3.1 Reference No.
The reference number in the left hand column 1 is the number of the national Standard and is
in numerical order.
3.2 Issue
Indicates the year in which the standard was
reprinted.
3.3 Title
Column 3 contains the title of the reprinted
standard.
3.4 Incorporated Amendments
Column 4 lists the amendments incorporated into the
reprint.
3.5 International Classification for Standards (ICS)
The last column indicates the ICS number(s) under which the subject matter is classified.
4. Amendments Published
4.1 Reference No.
The reference number in the left hand column 1 is the number of the amendment published.
4.2 Standard No.
Column 2 is the number of the standard to which the amendment was issued.
4.3 Title Column 3 is the title of the standard to which
the amendment was issued.
4.4 Scope of Amendment
Column 4 indicates the scope of the amendment.
4.5 International Classification for Standards (lCS)
The last column indicates the ICS number(s) under which the subject matter is classified.

6
SAZ Standards Development Update July –December 2022
SECTION 1: STANDARDS PROJECTS IN PROGRESS
Note: SAZ coordinated the development of the Zimbabwe National Standardization Strategy using the
ISO methodology. Two editions of the ZNSS have been have been published since 2018.
1 2 3 4 5
5
5 6
Automotive and Transportation (AT)
Reference No. Project/Title Stage IC
S Edition Regional, Continental
and
International
relationship	AT 001/SADCSTAN TC2
ISO 3877.1 Tyres, valves and tubes – List of equivalent
terms – Part 1: Tyres Prep Prep	91.140 1 Idt ISO 3877.1
ISO 3877.2 Tyres, valves and tubes – List of equivalent
terms – Part 2: Tyre valves Prep 91.140 1 Idt ISO 3877.2
ISO 3877.3 Tyres, valves and tubes – List of equivalent
terms – Part 3: Tubes
Prep 91.140 1 Idt ISO 3877.3
SADC ZW HS 318 Pneumatic Tyres for commercial purpose Prep 91.140 1 Idt SADC HS 318
SADC ZW HS 328 Pneumatic Tyres for vehicles and their
trailers
Prep 91.140 1 SADC ZW HS 328
ZWS 305 Pneumatic Tyre Valves Prep 91.140 2
SANS 20027 Uniform provision for approval
of advance warning triangles FDHT
43.040.
20
1 Idt SADCSTAN
NWIP TZS 698
Code of practice for
inspection and testing of
motor vehicle for road
worthiness
NWIP 43.180 1 Idt SADCSTAN
ARSO TC 59/Tripartite
standards
FDARS 1356
Roadside roadworthiness assessment of
motor vehicles-Code of practice FDHT
43.180 1 Idt FDARS 1356
ISO 3779 Road vehicles-Vehicle identification number
(VIN)-Content and structure FDHT 43.180 1 Idt ISO 3779
ISO 4925
Road vehicles-Specification of non-
petroleum-base brake fluids for hydraulic
systems
FDHT
43.180 1 Idt ISO 4925
ISO 4926 Road vehicles-Hydraulic braking systems-
Non-petroleum-base reference fluids FDHT
43.180 1 Idt ISO 4926
ZWS 1081
Uniform provisions concerning the approval
of vehicles with regard to specific
requirements for the electric power train
Published
43.180 1 Idt UNECER 100
ZWS 1082
Uniform provisions concerning the approval
of passenger cars powered by an internal
combustion engine only, or powered by a
hybrid electric power train with regard to the
measurement of the emission of carbon
dioxide and fuel consumption and/or
measurement of electric energy
consumption and electric range, and or
categories M1 and N1 vehicles powered by
an electric power train only with regard to
the measurement of electric energy
consumption and electric range
Published
43.180 1
ZWS 1085
Uniform provisions concerning the approval
of specific LPG (liquefied petroleum gases)
retrofit systems to be installed in motor
vehicles for the use of LPG in their
propulsion system and specific CNG
(compressed natural gas) retrofit systems to
be installed in motor vehicles for the use of
Published
43.180 1

7
SAZ Standards Development Update July –December 2022
CNG in their propulsion system
1 2 3 4 5 6
Reference No. Project/Title Stage ICS Edition
Regional,
Continental and
International
relationship
Building and Civil Engineering
ARSO THC03
BC 007
Relevant projects Prep 77.140 1
SI 168 Steel Products Prep 77.140 1
ZWS 284 Steel fencing materials Prep 77.140 1
BC 26
Revision of 519
Measurement of lettable and tenancy
available
Prep 47.020.80 1 \\
BC001
Revision of 678-1-9
Development maintenance of ground
water resources
CD 13.060.10 1
BC 012
ZWS 822
Dump proofing materials of buildings Prep 91.100 2
BC 013
SADC ZW HS 981:
2014
Burnt clay masonry units – Specification
(SR)
Draft 81.060 1 Idt SADC HS 981:
2014
SADC ZW HS 982:
2014
Concrete masonry units – Specification
(SR)
Prep 81.060 1 Idt SADC HS 982:
2014
ZWS 533: 1996 Laying precast concrete interlocking
pavers (SR)
Prep 81.060 1
ZWS 187: 1984 Concrete roofing tiles (SR) Prep 81.060 1
ARSO/TC 30
BS EN 13242:2013
Aggregates for unbound and hydraulically
bound materials for use in civil
engineering work and road construction
NWIP 81.060 1 Idt BS EN
13242:2013
BS EN 13285:2018 Unbound mixtures. Specifications NWIP 81.060 1 Idt BS EN
13285:2018
BS EN 933-1:2012 Tests for geometrical properties of
aggregates. Determination of particle size
distribution. Sieving method
NWIP 81.060 1 Idt BS EN 933-1:2012
BS EN 933-2:1996 Tests for geometrical properties of
aggregates. Determination of particle size
distribution. Test sieves, nominal size of
apertures
NWIP 81.060 1 Idt BS EN 933-2:1996
BS EN 933-3:2012 Tests for geometrical properties of
aggregates. Determination of particle
shape - Flakiness index
NWIP 81.060 1 Idt BS EN 933-3:2012
BS EN 933-4:2008 Tests for geometrical properties of
aggregates. Determination of particle
shape. Shape index
NWIP 81.060 1 Idt BS EN 933-4:2008
BS EN 933-5:1998 Tests for geometrical properties of
aggregates. Determination of percentage
of crushed and broken surfaces in coarse
aggregate particles
NWIP 81.060 1 Idt BS EN 933-5:1998
BS EN 933-6:2014 Tests for geometrical properties of
aggregates. Assessment of surface
characteristics. Flow coefficient of
aggregates
NWIP 81.060 1 Idt BS EN 933-6:2014

8
SAZ Standards Development Update July –December 2022
BS EN 933-7:1998 Tests for geometrical properties of
aggregates. Determination of shell
content. Percentage of shells in coarse
aggregates
NWIP 81.060 1 Idt BS EN 933-7:1998
BS EN 933-
8:2012+A1:2015
Tests for geometrical properties of
aggregates. Assessment of fines. Sand
equivalent test
NWIP 81.060 1 Idt BS EN 933-
8:2012+A1:2015
BS EN 933-
9:2009+A1:2013
Tests for geometrical properties of
aggregates. Assessment of fines.
Methylene blue test
NWIP 81.060 1 Idt BS EN 933-
9:2009+A1:2013
BS EN 933-10:2009 Tests for geometrical properties of
aggregates. Assessment of fines. Grading
of filler aggregates (air jet sieving)
NWIP 81.060 1 Idt BS EN 933-
10:2009
1 2 3 4 5 6
Reference No. Project/Title Stage ICS Edition
Regional,
Continental and
International
relationship	BS EN 933-11:2009 Tests for geometrical properties of
aggregates. Classification test for the
constituents of coarse recycled aggregate
NWIP 81.060 1 Idt BS EN 933-
11:2009
BC048
ZWD 877
Testing concrete
Part 1: Methods of sampling fresh
concrete on site
CD 91.100.30 1 Idt BS 1881 Part101
Part 2: Method for making test asbestos
from fresh cubes CD 91.100.30 1 BS 1881Part 108
Part 3: Method of normal wiring of test
specimens (20ºc Method) CD 91.100.30 1 Idt BS 1881 Part111
BC 048
ZWD 877
Part 4: Method for determination of
compressive strength of concrete users
Part 5: Specification for compression
testing machines for concrete
CD
CD
91.100.30
91.100.30
1
1
Idt BS 1881 Part116
Idt BS 1881 Part115
Part 6: Method for determination of
density of hardened concrete CD 91.100.30 1 Idt BS 1881 Part114
Part 7: Method for determination of pump CD 91.100.30 1 Idt BS 1881 Part102
ZWS EN 197 Part 1: Composition, specification and
conformity criteria for common cement Published 91.100.30 1 Idt EN 197 Part 1
Part 2: Conformity evaluation Published 91.100.30 1 Idt EN 197 Part 2
ZWS EN 413: Part 1
Masonry
cement Part 1:
Composition,
specifications
and
conformity
criteria
Published 91.100.30 1 Idt EN 413: Part 1
Chemicals
CH 001
ZWS D 207
Chlorinated lime calcium hypochlorite
specification Committee 65.080 2
ISO: 4198 Surface active agents -- Detergents for
hand dishwashing -- Guide for
comparative testing of performance
published 71.100.35 1 Idt ISO: 4198
ISO 8212 soaps and detergents techniques of
sampling during maintenance
Draft 71.100.35 1 Idt ISO: 8212
ISO 6835 Surface active agents -- Washing
powders -- Determination of total boron
content -- Titrimetric method
Draft 71.100.35 1 Idt ISO 6835
ISO 6837 Surface active agents -- Water dispersing
power in dry cleaning solvents
Draft 71.100.35 1 Idt ISO 6837

9
SAZ Standards Development Update July –December 2022
ISO 21703 Surface active agents -- Microbiology --
Microbiological test methods for liquid
hand dishwashing
Draft 71.100.35 1 Idt ISO 21703
ISO 8214 Surface active agents -- Washing
powders -- Determination of inorganic
sulphates -- Gravimetric method
Draft 71.100.35 1 Idt ISO 8214
ISO 7535 Surface active agents -- Detergents for
domestic machine dishwashing -- Guide
for comparative testing of performance
Draft 71.100.35 1 Idt ISO 7535
ISO CD TR 21681 Surface active agents -- Bio-based
surfactants -- Overview on surfactants
containing biomass
CD 71.100.35 1 Idt ISO CD TR 21681
ISO 8215 Surface active agents -- Determination of
total silica content -- Gravimetric method
Draft 71.100.35 1 Idt ISO 8215
ISO/CD 21680 Surface active agents -- Bio-based
surfactants -- Requirements and test
methods
CD 71.100.35 1 Idt ISO/ 21680
(ZNSS) Sodium hypochlorite solutions Draft 71.100.35 1 ARSO
(ZNSS) Antibacterial toilet soap Draft 71.100.35 1 ARSO
(ZNSS) Household dish washing liquid detergents Draft 71.100.35 1 ARSO
(ZNSS) Surface active agents -- Evaluation of
certain effects of laundering -- Methods of
analysis and test for unsoiled cotton
control clothibacterial toilet
71.100.35 1 ARSO
(ZNSS) Methods of test of formulated detergents Prep 71.100.35 1
EAS 296 Specification for liquid detergents-,
Detergents for household hand dish
washing
Draft 71.100.35 1 Idt EAS 296
CH003
Rev ZWS 962
Denatured fuel ethanol Prep 75.160 2
Rev ZW 964-1-5 Ethanol blends Prep 75.160 1
Rev ZWS913.1 Part
1
Petroleum industry Part 1: Storage and
distribution of petroleum products in
above ground bulk installations
Prep 75.160.30 2
ZWS 960 The handling, storage, distribution and
maintenance of liquefied petroleum gas in
domestic, commercial, and industrial
installations
Prep 75.160.30 2
ZWS 913.3:2011 Petroleum Industry – Requirements for
above ground tanks with integral
secondary containment and dispensers
Prep 75.160.30 2
SACSTAN TC 15
SANS 10234
Globally Harmonized System of
classification and labelling of chemicals
(GHS )
Prep 75.160 1 Idt 10234
Electro technical and Information Communications Technology
ICT 001
ISO/IEC 38500
Information technology -- Governance of
IT for the organization
Draft 35.020 2 Idt ISO/IEC 38500
EL 021
ZWS 556:
IEC 60335
13A plugs, socket outlets, adaptors and
connection units.
Part 1: Re-wirable 13A fused plugs
Part 2 13 A switched and un-switched
sockets outlets.
CD
CD
29.120.30
29.120.30
2
2
Idt IEC 60335-1
Idt IEC 60335-2
EL 028/SC 10
ZWS IEC 60335*
Household and similar electrical
appliances
1) Part 2-15
Particular requirements for appliances for
heating liquids
CD 97.030 1 Idt IEC 60335-2-15
ZWS IEC 60335-2-3 Household and similar electrical
appliances – safety
published 97.030 1 Idt IEC 60335-2-3
ZWS IEC 62552- 1 Household refrigerating appliances –
Characteristics and test methods: Part 1:
General requirements
Published 97.030 1 Idt IEC 62552: Part 1

10
SAZ Standards Development Update July –December 2022
ZWS IEC 62552- 2 Household refrigerating appliances –
Characteristics and test methods: Part 2:
Performance requirements
Published 97.030 1 Idt IEC 62552: Part 2
ZWS IEC 62552- 3 Household refrigerating appliances –
Characteristics and test methods:
Part 3: Energy consumption and volume
Published 97.030 1 Idt IEC 62552: Part 3
EL 003 System aspects for electrical energy
supplies
Prep 17.220 1
EL 004 Electrical installation of protection against
electric shock
Prep 27.180 1
EL009 ZWS
351:1993
The protection of structures against
lightning
Prep 91.120.40 1
ZWS 350 The protection of dwelling houses against
lighting
Prep 91.120.40 1
EL006 ZWS 400 Electrical wiring of premises SAZ wiring
rules
Prep 91.160 2
EL009 Graphical symbol for electrical diagram Prep 01.080 2
ZWS 890 High voltage bus bars and bus bar
connection
Prep 13.260 2
EL007 ZWS 120 Eucalyptus poles and cross arms Draft 79.040 1
Food and Agriculture (FA)
AG004
(national/regional)
Tobacco hessian bags – (national)
Tobacco and Tobacco products
Committee
Committee 65.160
1
1 Idt MS 75 –D1
Good agricultural practice (national) Committee
55.080
1 Idt SADCSTAN
AG 005
ZWS 112 -
Revision
Dog and cat foods Draft 65.120 2
ZWD 142 -Revision Pig feeds Draft 65.120 2
ZWS 517 -
Revision
Poultry feeds Draft 65.120 2
ZWS 518- Revision Cattle feeds Draft 65.120 2
ZWS 530- Revision Animal feeding stuffs – Sampling and
preparation of sample
Draft 65.120 2
FD 003
ARS ZW HS 832 Banana crisps Draft 67.080.20 1 Idt ARS 832
ARS ZW HS 847-
2016
Fresh potato tuber — Specification CD 67.060 1 Idt ARS 847
ARS ZW HS 848-
2016
Production and handling fresh ware
potatoes - Code of practice
CD 67.060 1 Idt ARS 848
ARS ZW HS 849-
2016
Reduction of acrylamide in potato
products – Code of practice
Draft 67.060 1 Idt ARS 849
ARS ZW HS 851-
2016
Frozen potato chips - Specification CD 67.060 1 Idt ARS 851
FD 017
Revision of ISO
22003-1
Food safety management systems —
Requirements for
bodies providing audit and
certification of food safety
management systems —
Part 1:
Requirements for bodies providing
audit and certification
of food safety management systems
Published 67.060 2 Idt ISO 22003-1
Revision of ISO
22003-2
Food safety management systems —
Requirements for
bodies providing audit and
certification of food safety
management systems —
Published 67.060 2 Idt ISO 22003-2

11
SAZ Standards Development Update July –December 2022
Part 2:
Requirements for bodies providing
evaluation and
certification of products, processes
and services, including
an audit of the food safety system
FD003
Rev ZWS 500
Wheat Flour Draft 67.060 2
DARS 461-2021 Maize grains (corn)-Specification DARS 67.060 2 DARS 461-2021
DARS 463-2021 Pearl millet grains - Specification CD 67.060 2 DARS 463-2021
Food and Agriculture (FA)
DARS 464-2021 Milled rice - Specification DARS 67.060 2 DARS 464-2021
CD ARS 465-2021 Wheat grains – Specification CD 67.060 2 CD ARS 465-2021
DARS 466-2021 Milled maize products-Specification DARS 67.060 2 DARS 466-2021
CD ARS 468-2021 Sorghum flour - Specification CD 67.060 2 CD ARS 468-2021
CD ARS 469-2021 Millet flour - Specification CD 67.060 2 CD ARS 469-2021
CD ARS 462-2021 Sorghum grains - Specification CD 67.060 2 CD ARS 462-2021
CD ARS 857-2021 Finger millet grains - Specification CD 67.060 2 CD ARS 857-2021
CD ARS 859-2021 Brown rice-Specification CD 67.060 2 CD ARS 859-2021
CD ARS 858-2021 Rough (paddy ) rice – Specification CD 67.060 2 CD ARS 858-2021
CD ARS 864-2021 Dry beans – Specification CD 67.060 2 CD ARS 864-2021
CD ARS 867-2021 Dry cowpeas – Specification CD 67.060 2 CD ARS 867-2021
CD ARS 868-2021 Dry pigeon peas – Specification CD 67.060 2 CD ARS 868-2021
CD ARS 869-2021 Dry whole peas – Specification CD 67.060 2 CD ARS 869-2021
CD ARS 870-2021 Lentils – Specification CD 67.060 2 CD ARS 870-2021
CD ARS 871-2021 Dry split peas – Specification CD 67.060 2 CD ARS 871-2021
ZWS 1050 Instant cereal and pulse based
porridge
Published 67.060 1
FD070
ZWS 348
(SR)
The manufacture of soft drinks and
soft drinks concentrate
CD 67.160.20 2
FD073 Tomato paste and chilli sauce Prep 67.080.20 1
FD074 Edible insects Prep 67.040 1
FD075
Revision of ZWS
749
Hazard Analysis Critical Control Point CD 67.020 2 CXC 1-1969
AG 001 Specification for Mono-Ammonium
Phosphate
Prep 65.080 2
IS 4830 Specification for Ammonium
Polyphosphate Solution
Prep 65.080 1 Idt IS 4830
IS 8359 Specification for Urea Ammonium
Phosphate
Prep 65.080 2 Idt IS 8359
IS 2279 Specification for Potash Chloride Prep 65.080 1 Idt IS 2279
IS 2764 Specification for Potassium sulphate Prep 65.080 1 Idt IS 2764
IS 12478 Specification for Ammonium
Sulphate
Prep 65.080 2 Idt IS 12478
IS 6046 Specification for Gypsum
(agricultural)
Prep 65.080 2 Idt IS:6046
ISO 3619 Specification for Ammonium
Thiosulphate Solution
Prep 65.080 2 Idt ISO 3619
ARS 504 Specification for Ammonium
Sulphate-Urea
Prep 65.080 2 Idt ARS 504
IS 826 Specification for Ammonium
Sulphate
Prep 65.080 2 Idt IS 826
IS 662 Specification for Anhydrous
Ammonia (gas)
Prep 65.080 2 Idt IS 662
ISO 7409 Specification for Urea-Ammonium
Nitrate Solution
Prep 65.080 2 Idt ISO 7409
FD 055
ZWS 1051
Free range eggs CD 67.060 1
Code of practice on free range poultry
production
published 67.060 1
DARS 1218 Handling, Processing, Quality
Evaluation and Storage of Poultry
Draft 67.060 1 Idt DARS 1218
DARS 1219 Poultry glossary of terms Draft 67.060 1 Idt DARS 1219

12
SAZ Standards Development Update July –December 2022
DARS 1200 Eggs in shell for processing-
Specification and grading
Draft 67.060 1 Idt DARS 1200
DARS 1199 Edible eggs in shell- Specification
and grading
Draft 67.060 1 Idt DARS 1199
DARS 1225 Chicken meat, Carcass and parts Draft 67.060 1 Idt DARS 1225
Food and Agriculture (FA)
DARS 1226 Duck meat and Parts Draft 67.060 1 Idt DARS 1226
DARS 1242 Goose meat and parts Draft 67.060 1 Idt DARS 1242
DARS:1202-2021 Preserved eggs-in-shell —
Specification and grading
Draft 67.060 1 Idt DARS:1202-2021
DARS 1203 Hens egg products for use in the food
industry — Specification
Draft 67.060 1 Idt DARS 1203
DARS 1205 Egg powder specification Draft 67.060 1 Idt DARS 1205
DARS 1245 Bovine (beef) meat –Carcasses and
cuts
Draft 67.060 1 Idt DARS 1245
DARS 1246 Veal meat- Carcasses and cuts Draft 67.060 1 Idt DARS 1246
DARS 1247 Caprine (goat) meat- Carcasses and
cuts
Draft 67.060 1 Idt DARS 1247
DARS 1248 Ovine (sheep) meat- Carcasses and
cuts
Draft 67.060 1 Idt DARS 1248
DARS 1250 Rabbit meat-Carcasses and cuts Draft 67.060 1 Idt DARS 1250
DARS 1216 Chicken essence-Specification Draft 67.060 1 Idt DARS 1216
DARS 1217 Ante-mortem and post-mortem
inspection of poultry — Code of
practice
Draft 67.060 1 Idt DARS 1217
CD ARS 1222 Canned curry chicken— Specification CD 67.060 1 Idt CD ARS 1222
CD ARS 1223 Poultry sausages-
specification
CD 67.060 1 Idt CD ARS 1223
Material Packaging
MA056
ZWS 257-2
Sawn softwood timber Part general
requirement
CD 79.040 2 Idt SANS 1783-1
ZWS 257-3 Part 3 Industrial grade timber CD
CD
79.040 2 Idt SANS 1783-3
ZWS 257-4
ZWS 257-5-1
Brandering and battens
Stress grade assessment
CD
Published
79.040
79.040
2
1
Idt SANS 1783-4
Idt SANS 1783-5-1
ZWS 257-5-2 Quality assurance of stress grading. Published 79.040 1 Idt SANS 1783-5-2
ZWS 717
ZWS 184
ZWS ISO 251
The manufacture and erection of timber
trusses
Wooden doors
Specification for conveyor belts
Prep
Prep
Prep
91.080.20
91.060.50
53.040.20
2
2
1
Idt SANS 10243
Idt SANS 545
Idt ISO 251
ZWS 1060: Part 1 Adhesives for wood Part 1: Terminology Published 53.040.20 1
ZWS 1060: Part 2 Adhesives for wood Part 2:
Requirements for structural application
Published 53.040.20 1
ZWS 1061 Health, safety and environmental
guidelines for the construction and
operation of timber treatment plants
Published 53.040.20 1
ZWS 1087 Structural timber – characteristic values
of strength-graded timber – sampling,
full-size testing and evaluation
Published 53.040.20 1
ZWS 1062 The preservative treatment of timber Published 53.040.20 1
MA 002
ZWS D 986
Non-traditional road additives Final draft 93.080.20 1

13
SAZ Standards Development Update July –December 2022
MA002
ZWS 467
Bitumen for road industrial and
purposes
Prep 75.140 2
MA002
ZWS 110
Test methods for bitumen Prep 75.140 2
BS EN 12597:2014 Bitumen and bituminous binders.
Terminology
Prep 75.140 1 Idt BS EN 12597:2014
BS EN 13108-
1:2016
Bituminous mixtures. Material
specifications. Asphalt Concrete
Prep 75.140 1 Idt BS EN 13108-
1:2016
BS EN 13108-
2:2016
Bituminous mixtures. Material
specifications. Asphalt Concrete for
Very Thin Layers (BBTM)
Prep 75.140 1 Idt BS EN 13108-
2:2016
BS EN 13108-
3:2016
Bituminous mixtures. Material
specifications. Soft Asphalt
Prep 75.140 1 Idt BS EN 13108-
3:2016
BS EN 13108-
4:2016
Bituminous mixtures. Material
specifications. Hot Rolled Asphalt
Prep 75.140 1 Idt BS EN 13108-
4:2016
BS EN 13108-
5:2016
Bituminous mixtures. Material
specifications. Stone Mastic Asphalt
Prep 75.140 1 Idt BS EN 13108-
5:2016
BS EN 13108-
6:2016
Bituminous mixtures. Material
specifications. Mastic Asphalt
Prep 75.140 1 Idt BS EN 13108-
6:2016
BS EN 13108-
7:2016
Bituminous mixtures. Material
specifications. Porous Asphalt
Prep 75.140 1 Idt BS EN 13108-
7:2016
BS EN 13108-
8:2016
Bituminous mixtures. Material
specifications. Reclaimed asphalt
Prep 75.140 1 Idt BS EN 13108-
8:2016
BS EN 13108-
9:2016
Bituminous mixtures. Material
specifications. Asphalt for Ultra-Thin
Layer (AUTL)
Prep 75.140 1 Idt BS EN 13108-
9:2016
BS EN 13108-
20:2016
Bituminous mixtures. Material
specifications. Type Testing
Prep 75.140 1 Idt BS EN 13108-
20:2016
BS EN 13108-
21:2016
Bituminous mixtures. Material
specifications. Factory Production
Control
Prep 75.140 1 Idt BS EN 13108-
21:2016
BS EN 1317-
1:2010
Road restraint systems. Terminology
and general criteria for test methods
Prep 75.140 1 Idt BS EN 1317-
1:2010
BS EN 1317-
2:2010
Road restraint systems. Performance
classes, impact test acceptance
criteria and test methods for safety
barriers including vehicle parapets
Prep 75.140 1 Idt BS EN 1317-
2:2010
BS EN 1317-
3:2010
Road restraint systems Performance
classes, impact test acceptance
criteria and test methods for crash
cushions
Prep 75.140 1 Idt BS EN 1317-
3:2010
BS EN 1317-
5:2007+A2:2012
Road restraint systems Product
requirements and evaluation of
conformity for vehicle restraint
systems
Prep 75.140 1 Idt BS EN 1317-
5:2007+A2:2012
EN/TR 1317-
6:2012
Road restraint systems - Part 6:
Pedestrian restraint system -
Pedestrian parapets
Prep 75.140 1 Idt EN/TR 1317-
6:2012
BS EN 13282-
1:2013
Hydraulic road binders. Rapid
hardening hydraulic road binders.
Composition, specifications and
conformity criteria
Prep 75.140 1 Idt BS EN 13282-
1:2013

14
SAZ Standards Development Update July –December 2022
BS EN 13282-
2:2015
Hydraulic road binders. Normal
hardening hydraulic road binders.
Composition, specifications and
conformity criteria
Prep 75.140 1 Idt BS EN 13282-
2:2015
MA054
ISO 3320
Power system components –
cylinders bores and piston rod
diameter and area ratios Mentz series
Prep 77.140 2 Idt ISO 3320
BC007
Nails ZWS 285
Mild steel nail Prep 77.140 2
LT 001
ZWS ISO 2588
b
Leather sampling number of items for
a gross sample
CD 59.140.30 2 Idt ISO 3320
ZWS ISO 2419 Leather –physical and mechanical
tests- sample preparation and
conditioning
CD 59.140.30 2 Idt ISO 2419
ZWS ISO 2418 Leather – chemical physical and
mechanical tests: sampling location
CD 59.140.30 2 Idt ISO 2418
ZWS ISO 1136 Wool: determination of diameter of
fibres –Air permeability
CD 59.140.30 1 Idt ISO 1136
ZWS ISO 7023 Packaging – Sacks – Method of
sampling empty sacks for testing.
(SR)
Prep 59.140.30 2 Idt ISO 7023
Limits of restricted substances in
textiles and apparel
Prep 59.140.30 1
Flags Prep 59.140.30 1
Specifications for printed materials Prep 59.140.30 1
Classification and grading of cotton
fibres
Prep 59.140.30 1
Canvas Prep 59.140.30 1
Woven blankets Prep 59.140.30 1
Requirements for second hand
textiles and apparels in trade
Prep 59.140.30 1
Limits of restricted substances in
leather and footwear
Prep 59.140.30 1
Car seat Prep 59.140.30 1
Specification for upholstery leather Prep 59.140.30 1
Leather seats Prep 59.140.30 1
Specification and grading of camel
hides
Prep 59.140.30 1
Code of practice for Garment
manufacturers
Prep 59.140.30 1
Specification for non-woven textile
gloves
Prep 59.140.30 1
Terminologies of Textile finishing Prep 59.140.30 1
Specification for mosquito nets Prep 59.140.30 1
Non-woven carrier bag -
Specification
Prep 59.140.30 1

15
SAZ Standards Development Update July –December 2022
Requirements for second hand
footwear in trade
Prep 59.140.30 1
Specification for Garment leather Prep 59.140.30 1
Specification for Leather sole Prep 59.140.30 1
Leather for jacket Prep 59.140.30 1
Brief case Prep 59.140.30 1
ZWS ISO 137 Wool determination of fibre diameter
projection microscope method
CD 59.140.30 2 Idt ISO 137
LT 001
ASTMD 6534M-14
Standard Specification for 100 %
Cotton Denim
Prep 59.080.30 1 Idt ASTMD 6534M-14
MA 053
ISO 3394
Plastic bags Prep 83.080 1 Idt ISO 3394
Modified Poly vinyl chloride pressure
pipe and couplings
Prep 83.120 1
ZWS ISO 1167-1 Thermoplastics pipes, fittings, and
assemblies for the conveyance of
fluids – Determination of the
resistance to internal pressure
Part 1: General method
Published 83.120 1 Idt ISO 1167-1
ZWS ISO 1167-2 Thermoplastics pipes, fittings, and
assemblies for the con-veyance of
fluids – Determination of the
resistance to in-ternal pressure
Part 2: Preparation of pipe test pieces
Published 83.120 1 Idt ISO 1167-2
ZWS ISO 1167-3 Thermoplastics pipes, fittings, and
assemblies for the con-veyance of
fluids – Determination of the
resistance to in-ternal pressure
Part 3: Preparation of components
Published 83.120 1 Idt ISO 1167-3
ZWS ISO 1167-4 Thermoplastics pipes, fittings, and
assemblies for the con-veyance of
fluids – Determination of the
resistance to in-ternal pressure
Part 4: Preparation of assemblies
Published 83.120 1 Idt ISO 1167-4
ZWS ISO 9852 Unplasticized poly(vinyl chloride)
(PVC-U) pipes — Di-chloromethane
resistance at specified temperature
(DCMT) — Test method
Published 83.120 1 Idt ISO 9852
ZWS ISO 2505 Thermoplastics pipes — Longitudinal
reversion — Test method and
parameters
Published 83.120 1 Idt ISO 2505
ZWS ISO 3127 Thermoplastics pipes – Determination
of resistance to exter-nal blows –
Round-the-clock method
Published 83.120 1 Idt ISO 3127
ISO 21138-3 Plastic piping systems for non-
pressure underground drainage and
sewerage
Prep 83.140 1 Idt ISO 21138-3
ISO 1307 Rubber hoses Prep 83.120 2 Idt ISO 1307
MA 054 Specification for steel wheel barrow Prep 77.140 1
KS 153 Specification for metal kitchen unit Prep 77.140 2 Idt KS 153
Specification for Metal clad insulated
panels
Prep 77.140 1
Specification for Lock gates Prep 77.140 1
Specification for shutters Prep 77.140 1
Specification for plates Prep 77.140 1
Specification for rods Prep 77.140 1
Specification for angles Prep 77.140 1
Specification for clad Prep 77.140

16
SAZ Standards Development Update July –December 2022
MA 055
ASTM F782-01
Specification for Flash doors Prep 77.140 1 Idt ASTM F782-01
AS/NES 4935 Specification for Wardrobes Prep 79.020 1 Idt AS/NES 4935
ASTM F2057 Specification for Bedroom suite Prep 79.020 1 Idt ASTM F2057
ASTM F 2057-2014 Specification for Dining room suite Prep 79.020 1 Idt ASTM F 2057-2014
MA007 Specification for coated and
corrugated steel roofing sheets
Prep 77.140 1
LT 001
FD ARS 1558
WD- TH07-11:2017,
Children's school shoes with direct
injection
Draft 13.340.50 1 Idt ARS 1558
FDARS 1559 Men's open shoes Draft 13.340.50 1 Idt ARS 1559
FDARS 1560 Men's closed shoes Draft 13.340.50 1 Idt ARS 1560
FDARS 1563 Children's shoes 0 -2 years Draft 13.340.50 1 Idt ARS 1563
FDARS 1564 Children's shoes 2 -6 years Draft 13.340.50 1 Idt ARS 1564

17
SAZ Standards Development Update July –December 2022
DARS 653
DARS 1575
DARS 658-1
DARS 658-2
DARS 1569
DARS 1570
DARS 1571
DARS 1572
DARS 1573
DARS 1574
ZW ARS HS 1552
ARS 1554
ARS 1555
ARS 1556
ARS 1557
Textiles –Sanitary towels –
specification
Textiles- Reusable sanitary towels
specification
Textiles- socks Part 1 Men and
women socks specification
Textiles- socks Part 2 commercial
and sports hose specification
The labelling and making of textiles
and households textiles articles
Printed Labels for textiles
Textile – woven socks packing
cement
Textiles disposable audit diapers
specification
Textiles woven cotton and similar
household fabrics and articles
General requirements for woven
textile piece –goods and households’
articles
Leather gloves specification Chrome
tanned bend outer sole leather
specification
Ladies fashion hand bags
specification
Leather gloves specification
Chrome tanned bend outer sole
leather specification
Draft
Draft
Draft
Draft
Draft
Draft
Draft
Draft
Draft
Draft
Publication
CD
CD
CD
CD
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
59.040
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
Idt DARS 653
Idt DARS 1575
Idt DARS 658-1
Idt DARS 658-2
Idt DARS 1569
Idt DARS 1570
Idt DARS 1571
Idt DARS 1572
Idt DARS 1573
Idt DARS 1574
Idt ARS 1552
Idt ARS 1554
Idt ARS 1555
Idt ARS 1557
Idt ARS 1557
Reference No. Title Stage ICS Edition Regional, Continental and
International
Pharmaceuticals
PH 001
ZWS ISO 16128-1
Guidelines on technical definitions and
criteria for natural & organic cosmetic
ingredients and products –
1) Part 1: Definitions for ingredients
2) Part 2: Criteria for ingredients and
products
IS
IS
71.100.70
71.100.20
1
1
Idt ISO 16128-1
Idt ISO 16128-2
PH 001
KS/EAS 794
Determination of the microbial inhibition
of cosmetic soap bars and liquid hand
and body washes – Test Method
Prep 11.080.20 1 Idt KS/EAS 794
ISO 8212 Soaps and detergents -- Techniques of
sampling during manufacture
CD 11.080.20 1 Idt ISO 8212

18
SAZ Standards Development Update July –December 2022
IS 286 Methods of sampling and test for soaps Prep 11.080.20 1 Idt IS 286
SANS 238 Liquid toilet soap — Specification Prep 11.080.20 1 Idt SANS 238
PH 007
ZWS 1080
Nicotine-containing tobacco free oral
product 3-(1- methyl, 2- Pyrrodinyl)
Pyrindine
Published 11.080.20 1
ARSO/TC 40
EAS 336: 2013
Chemical depilatories — Specification Prep 11.080.20 1 Idt EAS 336: 2013
EAS 337: 2013 Henna powder — Specification Prep 11.080.20 1 Idt EAS 337: 2013
EAS 339: 2013 Hair creams, lotions and gels —
Specification
Prep 11.080.20 1 Idt EAS 339: 2013
EAS 338: 2013 Chemical hair relaxers and hair waving
products — Specification
Prep 11.080.20 1 Idt EAS 338: 2013
EAS 340: 2013 Nail polish — Specification Prep 11.080.20 1 Idt EAS 340: 2013
EAS 341: 2013 Nail polish removers — Specification Prep 11.080.20 1 Idt EAS 341: 2013
EAS 342: 2013 Pomades and solid brilliantines —
Specification
Prep 11.080.20 1 Idt EAS 342: 2013
EAS 461-1: 2013 Hair dyes — Part 1: Aryl diamine based
formulated powders — Specification
Prep 11.080.20 1 Idt EAS 461-1: 2013
EAS 425-1: 2017 Skin powders — Specification — Part 1:
Body and face powder
Prep 11.080.20 1 Idt EAS 425-1: 2017
EAS 840: 2017 Shaving cream — Specification Prep 11.080.20 1 Idt EAS 840: 2017
EAS 841: 2017 Hair oils — Specification Prep 11.080.20 1 Idt EAS 841: 2017
EAS 842-1: 2017 Hair shampoo — Part 1: Soap based —
Specification
Prep 11.080.20 1 Idt EAS 842-1: 2017
EAS 842-2: 2017 Hair shampoo — Part 2: Synthetic
detergent-based — Specification
Prep 11.080.20 1 Idt EAS 842-2: 2017
EAS 786: 2013 Skin care creams, lotions and gels —
Specification
Prep 11.080.20 1 Idt EAS 786: 2013
EAS 361: 2004 Carbaryl dusting powders —
Specification
Prep 11.080.20 1 Idt EAS 361: 2004
EAS 844: 2017 Aryl di-amine-based liquid oxidation hair
dyes — Specification
Prep 11.080.20 1 Idt EAS 844: 2017
EAS 845: 2017 Cosmetic pencils — Specification Prep 11.080.20 1 Idt EAS 845: 2017
EAS 425-2 :2017 Skin powders –specification- Part 2:
Baby powders
Prep 11.080.20 1 Idt EAS 425-2 :2017
GYS 11-1: 1995 specification for cosmetics – Part 1:
General requirements
Prep 11.080.20 1 Idt GYS 11-1: 1995
EAS 961:2019 Glycerine for cosmetic use —
Specification
Prep 11.080.20 1 Idt EAS 961:2019
EAS 335 Cologne and perfume Prep 11.080.20 1 Idt EAS 335
CRS 16: 2010 (Unique product),Specification for
Botanical Cosmetics
Prep 11.080.20 1 Idt CRS 16: 2010
RS 361: 2018 (Unique product), Herbal petroleum jelly
— Specification
Prep 11.080.20 1 Idt RS 361: 2018
EAS 187 Tooth paste Prep 11.080.20 1 Idt EAS 187
EAS 786 Standard for Skin creams Prep 11.080.20 1 Idt EAS 786
EAS 425-2 Skin powders-Specification-Part 2: Baby
powder
Prep 11.080.20 1 Idt EAS 425-2
EAS 425-1 Skin powders-Specification-Part 1:Body
and face powder
Prep 11.080.20 1 Idt EAS 425-1
EAS 377-3 Cosmetics and cosmetics products- Part
3: List of colorants allowed in cosmetic
products
Prep 11.080.20 1 Idt EAS 377-3
EAS 842-1 Hair shampoo-Part 1:Soap based –
Specification
Prep 11.080.20 1 Idt EAS 842-1

19
SAZ Standards Development Update July –December 2022
EAS 377-5 Cosmetics and cosmetics products- Part
5: Use of UV filters in cosmetic products
Prep 11.080.20 1 Idt EAS 377-5
EAS 377-4 Cosmetics and cosmetics products- Part
4: List of preservatives allowed in
cosmetic products
Prep 11.080.20 1 Idt EAS 377-4
EAS 377-2 Cosmetics and cosmetics products- Part
2: List of substances which cosmetic
products must not contain except
subject to the restrictions laid do
Prep 11.080.20 1 Idt EAS 377-2
EAS 377-1:2013 Cosmetics and cosmetics products-Part
1: List of substances prohibited in
cosmetic products
Prep 11.080.20 1 Idt EAS 377-1:2013
EAS 126 Petroleum Jelly Prep 11.080.20 1 Idt EAS 126
EAS 964 Lip balm (salve) — Specification Prep 11.080.20 1 Idt EAS 964
EAS 960:2019 Deodorants and antiperspirants —
Specification
Prep 11.080.20 1 Idt EAS 960:2019
EAS 967 Shea butter for cosmetic industry—
Specification
Prep 11.080.20 1 Idt EAS 967
EAS 963 Lip balm (salve) — Specification Prep 11.080.20 1 Idt EAS 963
EAS 591 Body oils — Specification Prep 11.080.20 1 Idt EAS 591
EAS 957:2019 After shave —Specification Prep 11.080.20 1 Idt EAS 957:2019
EAS 965:2019 Lipstick — Specification Prep 11.080.20 1 Idt EAS 965:2019
EAS 958:2019 Baby oils — Specification Prep 11.080.20 1 Idt EAS 958:2019
EAS 844: 2017 Hair dyes — Liquid oxidation hair dyes
— Part 1: Aryl di-amine based—
Specification
Prep 11.080.20 1 Idt EAS 844: 2017
ARS 952:2015 Guidelines on good agricultural and
collection practices for traditional
medicinal plants
Draft 11.020 1 Idt ARS 952:2015
ARS 953:2015 Certification scheme for medicinal plant
produce
Draft 11.020 1 Idt ARS 953:2015
ARS 954:2015 :Minimum requirements for registration
of traditional medicines
Draft 11.020 1 Idt ARS 954:2015
ARS 955:2015 Safety, efficacy and quality of raw
materials and herbal medicines
Draft 11.020 1 Idt ARS 955:2015
ARS 956-1:2015 African Traditional Medicine—Aloe vera Draft 11.020 1 Idt ARS 956-1:2015
ARS 956-2:2015 African Traditional Medicine— Ambrosia Draft 11.020 1 Idt ARS 956-2:2015
][ARS 956-3:2015 African Traditional Medicine —- Urtica
dioica L
Draft 11.020 1 Idt ARS 956-3:2015
ARS 956-4:2015
African Traditional Medicine —
Calotropis procera
Draft 11.020 1
Idt ARS 956-4:2015
WD-ARS 958
Consumer guidance on good
preparation and use of ATM
Committee 11.020 1 Idt ARS 958
WD-ARS 959 Basic training guidelines for providers of
ATM
Committee
11.020 1 Idt ARS 959
WD ARS 960 Procedures for processing medicinal
plants
WD 11.020 1 Idt ARS 960
WD ARS 961 Packaging and labelling of raw
medicinal plant material
WD 11.020 1 Idt ARS 961
WD ARS 962 Storage of raw materials and prepared
ATM remedies
WD 11.020 1 Idt ARS 962
WD ARS 963 Requirements for packaging and
labelling of ATM remedies
WD 11.020 1 Idt ARS 963

20
SAZ Standards Development Update July –December 2022
WD ARS 964 Certification of herbal medicine
production facilities
Committee 11.020 1 Idt ARS 964
WD ARS 965 Preparation of ATM remedies Committee 11.020 1 Idt ARS 965
WD ARS 966 Safety and quality of tools used in ATM Committee 11.040.01 1 Idt ARS 966
WD ARS 967 Sustainability procedures for medicinal
plant resources
Committee 11.020 1 Idt ARS 967
WD ARS 968 ATM – Guidelines for
pharmacovigilance
Committee 11.020 1 Idt ARS 968
ARP 154
A
Guidelines for sustainable harvesting of
medicinal plants
Committee 11.020 1 Idt ARP 154
ARP 029 Guidelines on good agricultural
practices for medical plants
Committee 11.020 1 Idt ARP 029
SANS 1683 Moringa Committee 11.020 1 Idt SANS 1683
1 2 3 4 5 6
Reference No.
Title
Stage ICS Edition
Regional, Continental
and
International
Safety, Health, Environment and Quality
Environmental Management Systems-
Combating land degradation and
desertification
25.080.01 2 Idt ISO NP 14045-2
EN 001/ISO TC 207 ISO
14055
Part 2: Case studies NP
ISO AWI 14100 Green Finance Assessment of Green
Financial Projects
AWI 25.080.01 1 Idt ISO AWI 14100
ISO 14040:2006/D Amd 1
Environmental management -- Life cycle
assessment -- Principles and framework Published 25.080.01 1 Idt ISO 14040
Idt ISO 14044
ISO 14044: 2006/D Amd
2
Environmental management -- Life cycle
assessment -- Requirements and
guidelines Published 25.080.01 1 Idt ISO 14044
ISO/AWI TS 14074
Environmental management -- Life cycle
assessment -- Principles, requirements
and guidelines for normalization,
weighting and interpretation
AWI 25.080.01 1 Idt ISO 14074

21
SAZ Standards Development Update July –December 2022
ISO /AWI 14075 Principles and framework for social life
cycle assessment NP 25.080.01 1 Idt ISO AWI 14075
ISO/WD 14076 Techno economic analyses: Principles,
requirements and guidelines
WD 25.080.01 1 Idt ISO WD 14076
ISO DIS / 14020
Environmental statements and
programmes for products-Principles and
general requirements
DIS 13.020.10 1 Idt ISO DIS 14020
ISO CD 19991-
Environmental conscious design (ECD)
Principles and requirements and
guidance
CD 13.020 1 Idt ISO CD 19991
ISO/DIS 14002/2 EMS-Guidelines for using ISO 14001 to
address environmental aspects and
conditions within an environmental topic
area-Part 2:Water
WD
13.020 1 Idt ISO DIS 14002/2
EN 006 Noise limits (MS173) Preparatory 17.140.20 1 Idts MSI 73
EN 007 (ISO TC 247)
ISO DIS 50003
Energy management systems-
Requirements for bodies providing audit
and certification of energy management
systems
DIS 27.010 1
Idt ISO 50003
ISO DIS 50005 EMS Implementation of 50001 CD 27.010 1 Idt ISO 50005
ISO DIS 50006 EMS Evaluation of energy performance DIS 27.010 1 Idt ISO 50006
ISO DIS 50009 EMS Guidelines for multiple DIS 27.010 1 Idt ISO/DIS 50009
ISO AWI 50010 EMS Guidelines for zero net AWI 27.010 1 Idt ISO 50010
EN009
ZWS 558 (SR)
Effluent waste water CD 13.060.30 2
EN 001
ZWS ISO 14031
EM –environmental performance
evaluation guidelines
SR 13.020 2 Idt ISO 14031
EN 001
ZWS ISO/DIS 14063
EM- environmental communication
guidelines and examples
DIS 13.020 2 Idt ISO/DIS 14063
Safety, Health, Environment and Quality
SA 013
ZWS 275
Fire detection and alarm systems in
buildings
CD 13.220.20 2
SA 013
ZWS 275
(
Fire detection and alarm systems in
buildings
CD 13.220.20 2
QA 002
ZWS ISO 9000 Quality management systems-
Fundamentals and vocabulary
IS 03.120.10 2 Idt ISO 9000
ISO 9004 QM – Managing for the sustained
success of an organization and quality
management approach
IS 03.120.10 2 Idt ISO 9004
QA 003 (ISO CASCO)
ISO 1702
Conformity assessment –
Requirements for bodies providing audit
and certification of management
systems
Part 1: Requirements for bodies
providing audit and certification of
management systems
IS
03.120.20 1
Idt ISO 17021-1
Part 9: Competence requirements for
auditing and certification of anti-bribery
management system
IS 03.120.20 1 Idt ISO 17021-9
Part 10: Competence requirements for
auditing and certification
IS 03.120.20 1 Idt ISO 17021-9
SA 007* Safe use of x-rays in interventional
radiology
Committee 13.280 1

22
SAZ Standards Development Update July –December 2022
Qualification and training of radiation
workers
Committee 13.280 1
Safe transportation of radioactive
materials
Committee 13.280 1
ZWS 701 Radiation protection in density Committee 13.250 2
ZWS 702 Radiation protection in industry Committee 13.280 2
ZWS 703 Radiation protection in veterinary
radiology
Committee 13.280 2
ZWS D 704 Radiation waste management Committee 13.280 2
ZWS D 705 Safe use of x rays in medical diagnostic
radiology
Committee 13.280 2
SA 012
ISO TC 283
ISO 45003
Occupational health and safety
management system – psychological
health and safety in work place-
guidelines
published 13.100 1 Idt ISO 45003
SA 011
ISO TC 135
ISO 16371-1:2011
NDT – Industrial computed radiography
with storage phosphor imaging plates –
Part 1: Classification systems
IS 19.100 1 Idt ISO 16371-1
ISO 16526-1:2011 NDT – Measurement and evaluation of
the X-ray tube voltage Part 1: Voltage
divider method
Part 2: 2011
Constancy check by the thick filter
method
IS
IS
19.100
19.100
1
1
Idt ISO 16526-1
Idt ISO 16526-2
Part 3: 2011
Spectrometric method
IS 19.100 1
Idt ISO 16526-3
1 2 3 4 5 6
Reference No. Title Stage ICS Edition
Regional, Continental
and
International
Safety, Health, Environment and Quality
ISO 19232-1:2013 NDT – Image quality of radiographs –
Part 1: Determination of the image
quality value using wire type image
quality indicators
IS
19.100 1 Idt ISO 19232-1
Part 2: Determination of the image
quality value using step type image
quality indicators
IS 19.100 1 Idt ISO 19232-2
Part 3: Image quality classes IS 19.100 1 Idt ISO 19232-3

23
SAZ Standards Development Update July –December 2022
Part 4: Experimental evaluation of
image quality values and quality tables
IS 19.100 1
Idt ISO 19232-4
1	SA 013
ZWS 1046
Revision of ZWS 202
Installation to missioning maintenance of
fire hose reels
Graphical symbols safety colors and
safety signs
Draft
CD
13.22.10
01.080
1
2 Idt ISO 7010
ISO 3864 -1 ISO 3864 Graphical symbols — Safety
colours and safety signs —Part 1:
Design principles for safety signs and
safety markings
Draft 01.080 1
Idt ISO 3864 -1
ISO 3864-2 ISO 3864 Graphical symbols — Safety
colours and safety signs —Part 2:
Design principles for product safety
labels
Draft 01.080 1 Idt ISO 3864-2
ISO 3864 -3 ISO 3864 Graphical symbols — Safety
colours and safety signs — Part 3:
Design principles for graphical symbols
for use in safety signs
Draft 01.080 1 Idt ISO 3864 -3
ISO 3864 -4 ISO 3864 Graphical symbols — Safety
colours and safety signs —Part 4:
Colorimetric and photometric properties
of safety sign materials
Draft 01.080 1 Idt ISO 3864 -4
SE 003
Risk Management
ZWS ISO 31022
Guidelines for implementation of legal
risk management IS 03.100.01 1 Idt ISO 31022
ISO/IEC 31010 Risk management – Risk assessment
techniques Published 03.100.01 1 Idt ISO/IEC 31010
ISO/CD 31030 Risk management managing travel
risks-Guidance for organizations published 03.100.01 1 Idt ISO CD 31030
ISO NP IWA 31 Using ISO 31000 guidance on risk
management
NP 03.100.01 1 Idt ISO NP IWA 31
ISO IEC/AWI 31050 Guidance for managing energy risk to
risk enhance resilience AWI 03.100.01 1 Idt ISO !EC/AWI 31050
SE 007
Human Resources
ISO 10667
Assessment service delivery procedure
and methods to assess people in work
and organizations
Part 1: setting requirements for the
client
Part 2: Requirements for service
provider
FDIS
FDIS
03.100.30
03.100.30
1
1
Idt ISO FDIS10667-1
Idt ISO FDIS 10667-2
ISO AWI 30419
ISO FDIS 30415
Guidelines recruitment process
Diversity and Inclusion
AWI
FDIS
03.100.30
03.100.30
1
1
Idt ISO AWI 30419
Idt ISO FDIS 30415
ISO 10667-1: 2020 Assessment service delivery --
Procedures and methods to assess
people in work and organizational
settings -- Part 1: Requirements for the
client
draft 03.100.30 1 Idt ISO 10667-1: 2020
ISO 10667-2: 2020 Assessment service delivery --
Procedures and methods to assess
people in work and organizational
settings -- Part 2: Requirements for
service providers
draft 03.100.30 1 Idt ISO 10667-2: 2020
ISO 24178:2021 Human resource management –
Organizational culture metrics cluster
draft 03.100.30 1 Idt ISO 24178:2021
ISO 24179:2020 Human resource management –
Occupational health and safety metrics
draft 03.100.30 1 Idt ISO 24179:2020
ISO TS 30423:2021 Human resource management –
Compliance and ethics metrics cluster
published 03.100.30 1 Idt ISO TS 30423:2021

24
SAZ Standards Development Update July –December 2022
ISO TS 30425:2021 Human resource management –
Workforce availability metrics cluster
draft 03.100.30 1 Idt ISO TS 30425:2021
ISO 30427:2021 Human resource management – Costs
metrics cluster
draft 03.100.30 1 Idt ISO 30427:2021
ISO/TS 30430:2021 Human resource management —
Recruitment metrics cluster
published 03.100.30 1 Idt ISO/TS 30430:2021
SE 008 (ARSO) ARS
1651
Financial services : Good financial grant
practice
ARS 03.060 1 Idt ARS 1651
SE 006
ISO 37001
Anti-bribery management systems --
Requirements with guidance for use
corporate governance
Prep 03.100.02 1 Idt ISO 37001
ISO/AWI 37000 Guidance for the governance of
organizations
Prep 03.100.02 1 Idt ISO/AWI 37000
ISO/NP 37002 Whistleblowing management systems --
Guidelines
Prep 03.100.02 1 Idt ISO/NP 37002
ISO/AWI 37301 Compliance management systems --
requirements with guidance for use
Prep 03.100.02 1 Idt ISO/AWI 37301
SE 010
ISO/DIS 20400.2
Sustainable procurement – Guidance Prep 03.100 Idt ISO/DIS 20400.2
SE 011
ZWS 1057
Cash and valuables in transit
Committee
13.310 1 Idt: BS 7872
ZWS D 1063 Closed circuit television (CCTV)-
Management and operation –code of
practice
Committee
13.310 1
SECTION 2: STANDARDS PUBLISHED DURING THE PRECEDING SIX MONTHS
NOTE: The publications listed below are new SAZ Standards already published and are now available on
sale from the SAZ Information Centre.
Reference No. Title ICS Edition
Regional, Continental
and
International
ZWS 1057:2022 Manned security services – cash and valuables
in transit services (Collection and Delivery)
03.060 1
ZWS 1051:2021 Good agricultural practices for free range
poultry production
67.060 1
ZWS ISO 45003:2021 Occupational health and safety management – 13.100 1 Idt ISO 45003:2021

25
SAZ Standards Development Update July –December 2022
psychological health and safety at work –
guidelines for managing psychosocial risks
ZWS ISO TS 30423:2021 Human resource management – compliance
and ethics metrics cluster
03.100.30 1 Idt ISO TS 30423:2021
ZWS ISO/IEC
31010:2019
Risk management – risk assessment
techniques 03.100.01 1 Idt ISO/IEC 31010
ZWS ISO TS 30430:2021 Human resource management – recruitment
metrics cluster
03.100.30 1 Idt ISO/TS 30430:2021
ZWS ISO 31073:2022 Risk management – vocabulary 03.100.01 1 Idt ISO/IEC 31073
ZWS ISO 31022:2020 Risk management – guidelines for the
management of legal risk 03.100.01 1 Idt ISO/IEC 31022
ZWS ISO TS 30425:2021 Human resource management – workforce
availability metrics cluster
03.100.30 1 Idt ISO TS 30425:2021
ZWS 1089:1999 Baking powder 67.060 1
ZWS IEC 60364: Part 4 -
42:2014
Low voltage electrical installations
Part 4-42: Protection for safety –
protection against thermal effects
97.030 1 Idt IEC 60364: Part 4 -
42:2014
ZWS ISO 4198:1984
Surface active agents – detergents for washing
fabrics – guide for comparative testing of
perfomance
71.100.35 1 Idt ISO: 4198
ZWS ISO 6835:1981 Surface active agents – washing powders –
determination of total boron content – titrimetric
method
71.100.35 1 Idt ISO: 6835
ZWS IEC PAS 62840:
Part 3:2021
Electric vehicle battery swap system
Part 3: Particular safety and
interoperability requirements for battery swap
systems operating with removable ress/battery
systems
97.030 1 Idt IEC 62480: Part part
3
ZWS IEC 62196: Part
1:2014
Plugs, socket-outlets, vehicle connectors and
vehicle inlets – conductive charging of electric
vehicles
Part 1: General requirements
97.030 1 Idt IEC 62196: Part part
1
ZWS IEC 62196: Part
2:2016
Plugs, socket-outlets, vehicle connectors and
vehicle inlets – conductive charging of electric
vehicles
Part 2: Dimensional compatiblity and
interchangeability requirements for A.C pin and
contact-tube accessories
97.030 1 Idt IEC 62196: Part part
2
ZWS IEC TS 61980:Part
2:2019
Electric vehicle wireless power transfer (WPT)
systems
Part 2: Specific requirements for
communication between electric road vehicle
(EV) and infrastructure
97.030 1 Idt IEC 62480: Part part
3
ZWS 1081
Uniform provisions concerning the approval of
vehicles with regard to specific requirements for
the electric power train
43.180 1 Idt UNECER 100
ZWS 1082
Uniform provisions concerning the approval of
passenger cars powered by an internal
combustion engine only, or powered by a hybrid
electric power train with regard to the
measurement of the emission of carbon dioxide
and fuel consumption and/or measurement of
electric energy consumption and electric range,
and or categories M1 and N1 vehicles powered
by an electric power train only with regard to the
measurement of electric energy consumption
and electric range
43.180 1
ZWS 1085
Uniform provisions concerning the approval of
specific LPG (liquefied petroleum gases) retrofit
systems to be installed in motor vehicles for the
use of LPG in their propulsion system and
specific CNG (compressed natural gas) retrofit
systems to be installed in motor vehicles for the
use of CNG in their propulsion system
43.180 1
ZWS EN 197-1 Part 1: Composition, specification and
conformity criteria for common cement
91.100.30 2 Idt EN 197-1
ZWS EN 197-2 Part 2: Conformity evaluation 91.100.30 2 Idt EN 197-2
ZWS EN 413- 1 Masonry cement Part 1: Composition, 91.100.30 2 Idt EN 413- 1

26
SAZ Standards Development Update July –December 2022
specifications
ZWS IEC 62552- 1 Household refrigerating appliances –
Characteristics and test methods: Part 1:
General requirements
97.030 1 Idt IEC 62552: Part 1
ZWS IEC 62552- 2 Household refrigerating appliances –
Characteristics and test methods: Part 2:
Performance requirements
97.030 1 Idt IEC 62552: Part 2
ZWS IEC 62552- 3 Household refrigerating appliances –
Characteristics and test methods:
Part 3: Energy consumption and volume
97.030 1 Idt IEC 62552: Part 3
ZWS ISO 22003-1 Food safety management systems —
Requirements for
bodies providing audit and certification of food
safety
management systems —
Part 1:
Requirements for bodies providing audit and
certification
of food safety management systems
67.060 2 Idt ISO 22003-1
ZWS ISO 22003-2 Food safety management systems —
Requirements for
bodies providing audit and certification of food
safety
management systems —
Part 2:
Requirements for bodies providing evaluation
and
certification of products, processes and
services, including
an audit of the food safety system
67.060 2 Idt ISO 22003-2
ZWS 1050 Instant cereal and pulse based porridge 67.060 1
ZWS 257-5-1 Stress grade assessment 79.040 1 Idt SANS 1783-5-1
ZWS 257-5-2 Quality assurance of stress grading. 79.040 1 Idt SANS 1783-5-2
ZWS 1060: Part 1 Adhesives for wood Part 1: Terminology 53.040.20 1
ZWS 1060: Part 2 Adhesives for wood Part 2: Requirements for
structural application
53.040.20 1
ZWS 1061 Health, safety and environmental guidelines for
the construction and operation of timber
treatment plants
53.040.20 1
ZWS 1087 Structural timber – characteristic values of
strength-graded timber – sampling, full-size
testing and evaluation
53.040.20 1
ZWS 1062 The preservative treatment of timber 53.040.20 1
ZWS ISO 1167-4 Thermoplastics pipes, fittings, and assemblies
for the con-veyance of fluids – Determination of
the resistance to in-ternal pressure
Part 4: Preparation of assemblies
83.120 1 Idt ISO 1167-4
ZWS ISO 9852 Unplasticized poly(vinyl chloride) (PVC-U) pipes
— Di-chloromethane resistance at specified
temperature (DCMT) — Test method
83.120 1 Idt ISO 9852
ZWS ISO 2505 Thermoplastics pipes — Longitudinal reversion
— Test method and parameters
83.120 1 Idt ISO 2505
ZWS ISO 3127 Thermoplastics pipes – Determination of
resistance to exter-nal blows – Round-the-clock
method
83.120 1 Idt ISO 3127
ZWS 1080 Nicotine-containing tobacco free oral product 3-
(1- methyl, 2- Pyrrodinyl) Pyrindine
11.080.20 1
ISO 14040:2006/D Amd
1
Environmental management -- Life cycle
assessment -- Principles and framework 25.080.01 1 Idt ISO 14044
ISO 14044: 2006/D Amd
2
Environmental management -- Life cycle
assessment -- Requirements and guidelines 25.080.01 1 Idt ISO 14044
ZWS ISO/TS 22003: Part
1:2022
Food safety
Part 1 – Requirements for bodies providing
67.060 2 Idt ISO 22003-1

27
SAZ Standards Development Update July –December 2022
audit and certification of food safety
management systems
ZWS ISO/TS 22003: Part
2
Food safety
Part 2 – Requirements for bodies providing
evaluation and certification of products,
processes and services, including an audit of
the food safety system
67.060 2 Idt ISO 22003-2
ZWS ISO 37301 Compliance management systems —
Requirements with guidance for use 25.080.01 1 Idt ISO 14044
ZWS 1087 Structural timber – characteristic values of
strength-graded timber – sampling, full-size
testing and evaluation
53.040.20 1
SECTION 3: REPRINTS PUBLISHED DURING THE PRECEDING SIX MONTHS
1 2 3 4 5
Reference No. Issue Title ICS Edition
SECTION 4: AMENDMENTS / CONFIRMATION SLIPS /ENDORSEMENT SLIPS PUBLISHED DURING
THE PRECEDING SIX MONTHS
Reference No. Standard No. Title Scope of ES ICS`

export const SAZ_CATALOGUE_DOC: CodeDocument = parseCodeDocument({
  id: 'saz-catalogue',
  code: 'saz',
  jurisdiction: 'zimbabwe',
  title: 'SAZ Standards Development Update July-December 2022',
  text: SAZ_CATALOGUE_TEXT,
})

export const TYPOLOGIES_GUIDE_TEXT: string = `The Complete Guide to All Building
Typologies: Spatial Programming,
Dimensional Standards, and
Environmental Systems
Fundamentals of Architectural Programming and
Typological Analysis
Architectural design relies on the systematic categorization of structures by form and function to
study their patterns, requirements, and performance profiles. Building typology serves as a
foundational classification system, dividing architectural analysis into Functional
Typologies—categorized by the human activities they shelter—and Formal Typologies, which
group buildings by their physical footprint, massing, and configuration. Under this framework, a
building’s design is a direct manifestation of how its structural "bones" interact with localized site
constraints, anthropometric metrics, and historical styles.
+------------------------------------------------─────────────────────
───+
| 	SEQUENTIAL DESIGN LAYERS
|
+------------------------------------------------─────────────────────
───+
| LEVEL 1: FUNDAMENTALS (Anthropometry, Site Analysis, Style
Archetype) |
| 	│
|
| LEVEL 2: INTERIOR SPACE PROGRAMMING (Primary, Support, Specialty)
|
| 	│
|
| LEVEL 3: TECHNICAL & ENVIRONMENTAL SYSTEMS (Lighting, Thermal,
HVAC) |
| 	│
|
| LEVEL 4: EXTERIOR & MACRO PLANNING (Parking, Landscape, Access)
|
| 	│
|
| LEVEL 5: CONSTRUCTION DETAILING (Structural Grids, Fabrication
Specs) |
+----------------------------------------------------------------─────
───+

To create a functional building, programming must progress through five sequential design
layers:
1. Fundamentals: Formulating design parameters based on human scale (anthropometry),
localized site analysis, climate variables, and historical styles.
2. Interior & Room Design: Sizing rooms, clearances, and circulation paths to optimize
spatial sequences.
3. Technical & Environmental Systems: Integrating mechanical, electrical, and plumbing
infrastructure alongside lighting, thermal comfort, and acoustics.
4. Exterior & Macro Planning: Designing the site layout, vehicular parking, loading docks,
and landscaping.
5. Construction Details: Generating structural grids, joinery drawings, material
specifications, and construction documents.
In typological history, a clear distinction is maintained between the "bones" of a building type
and its applied decorative style. When a functional form is combined with regional stylistic
motifs, it yields a distinctive architectural expression. For example, the Shotgun house
type—characterized by its narrow, one-room-wide, single-story plan—displays classical columns
and deep porches when built in the Greek Revival style, but features exposed rafter tails,
decorative brackets, and deep overhangs when executed as an Arts and Crafts double-shotgun.
Similarly, the Creole Cottage utilizes timber framing and a recessed gallery to handle regional
humidity, while avoiding decoration that conflicts with its structural layout.
Stylistic overlays evolve across eras to balance aesthetics, construction methods, and cultural
values. The early twentieth century saw the emergence of Eclectic and Exotic Revivals, which
scaled down grand historical precedents into residential models. This trend produced Spanish
Mission cottages with faux bell towers, Norman Revival farmhouses compressed to compact
footprints, and Renaissance palazzos translated into single-family homes. These revivals relied
on stucco, terracotta roof tiles, and arched entryways to suggest historical depth.
This movement was followed by Art Deco, which emerged from the 1925 Paris Exposition. Art
Deco replaced historical revivalism with bold geometric forms, vertical bands, smooth stucco
surfaces, and bas-relief ornamentation. This style used concrete, steel, and terracotta to
express modernism in civic and commercial structures, as seen in landmark buildings like
Charity Hospital and the Lakefront Airport in New Orleans.
When planning modern commercial developments, developers often adapt traditional residential
forms to establish a contextual streetscape. These residentially influenced commercial
configurations are structured around specific footprint and massing rules:
Table 1: Commercial Building Form and Massing Configurations
Structural Form Type Height and Scale Limit Primary Roofing
Standard
Detailing & Functional
Application
Central Block with
Wings
1 to 3 stories; central
block must maintain a
higher ridge line than
the flanking wings.
Flat roof with parapet
walls or gabled central
block with flat-roofed
wings.
Designed to break up
long facades;
decorative details are
concentrated on the
projecting central block.
Hall-Parlor / Central
Passage
1 to 2 stories; restricted
to footprints under
Steeply pitched gable
roof (8:12 to 14:12 pitch
Symmetric facade
layout; best suited for

Structural Form Type Height and Scale Limit Primary Roofing
Standard
Detailing & Functional
Application
580\\text{ m}^2
(6,250\\text{ sq ft}).
profile) or classic hip
roof.
small commercial
offices or retail
boutiques.
Cross Wing / Gabled
Ell
1 to 2.5 stories;
asymmetric footprint
matching Victorian-era
planning.
Steeply pitched
cross-gables with deep
eaves and fascia trim.
Irregular massing
allows nested entry
porches; fits larger,
multi-departmental
layouts.
Bungalow / Craftsman 1 to 1.5 stories;
low-profile massing
with deep front
porches.
Low-pitched gable roof
with exposed rafter tails
and wide fascia boards.
Features side
driveways and a
porte-cochere, making
it ideal for drive-through
bank lanes.
Residential and Domestic Typologies
Designing residential typologies requires balancing anthropometric clearance standards with
efficient spatial layouts. Kitchens and bathrooms serve as the primary functional nodes of the
home, where spatial dimensions are determined by the reach and movement of the human
body.
Residential Kitchen Ergonomics
The kitchen workspace is planned around the kitchen work triangle, which connects the three
primary task centers: the cleaning station (sink), the cooking station (cooktop/range), and the
food storage station (refrigerator). Keeping these zones in close proximity minimizes
unnecessary travel, while maintaining adequate spacing prevents crowding.
[ CLEANING ZONE ] (Sink)
/\\
/ \\
Leg 1: 1.2-2.7 m / 	\\ Leg 2: 1.2-2.7 m
/ 	\\
/ 	\\
[ STORAGE ZONE ] ────────────────────── [ COOKING ZONE ]
(Refrigerator) 	Leg 3: 1.2-2.7 m 	(Cooktop/Oven)
Total: <= 7.9 m
To ensure an efficient workflow, design layouts must comply with standard ergonomic distances:
● The length of any single leg of the work triangle must be between 1.2\\text{ m} (4\\text{ ft})
and 2.7\\text{ m} (9\\text{ ft}).
● The sum of the three sides of the work triangle must not exceed 7.9\\text{ m} (26\\text{ ft}).
● No leg of the triangle may intersect a kitchen island, peninsula, or other floor-mounted
obstacle by more than 305\\text{ mm} (12\\text{ in}).
● The main household traffic lanes must not cross through the work triangle.
In practice, residential kitchens are organized into five primary functional zones: pantry and dry
storage, sink and wet cleaning, food preparation, cooking, and auxiliary zones such as charging

or dining stations. Sizing cabinetry, worktops, and circulation paths to standardized dimensions
is necessary to maintain a balanced layout:
Table 2: Technical Cabinet and Clearance Dimensions for Residential
Kitchens
Kitchen Component /
Zone
Height Standard
(Metric)
Width Standard (Metric) Depth / Clearance
Metric
Base Cabinet
Modules
720\\text{ mm}
(excluding support
legs)
300, 450, 600, 900\\text{
mm}
600\\text{ mm} nominal
depth
Wall-Hung Cabinet
Modules
720\\text{ to } 900\\text{
mm}
300\\text{ to } 600\\text{
mm}
300\\text{ mm} (to clear
line of sight)
Upper Cabinet
Installation
Installed 1400\\text{ to }
1500\\text{ mm} off floor
N/A 	300\\text{ mm} depth
Single-Cook Work
Aisle
N/A 	N/A 	1067\\text{ mm}
(42\\text{ in}) minimum
clearance
Multi-Cook Work
Aisle
N/A 	N/A 	1219\\text{ mm}
(48\\text{ in}) minimum
clearance
Countertop Height by
User
800\\text{-}900\\text{
mm} (for 1.7\\text{ m}
tall user)
N/A 	600\\text{ mm} deep
work surface
Bar Stool Clearance 700\\text{-}800\\text{
mm} seat height
N/A 	250\\text{ mm}
seat-to-counter space
Under-Cabinet Toe
Recess
100\\text{ to } 150\\text{
mm}
N/A 	60\\text{ to } 80\\text{
mm} toe depth
Electrical Outlets 	Mounted 1100\\text{
mm} off finished floor
N/A 	150\\text{ to } 200\\text{
mm} above countertop
Dimensional Standards for Doors, Windows, and Pipes
Integrating standard construction components prevents sizing errors during document
preparation and on-site assembly.
Under British Standard (BS 4787-1:1980) and European guidelines, standard door dimensions
must meet specific width, height, and accessibility targets:
Table 3: Dimensional Standards for Residential and Commercial
Openings
Opening Element Type Standard Height 	Standard Width 	Operational Clearance
Requirements
Metric Internal Door
Leaf
2040\\text{ mm} 	526, 626, 726, 826,
926\\text{ mm}
Door frame thickness of
40\\text{ or } 44\\text{
mm}.
Standard External 	2000\\text{ mm} 	807\\text{ mm} 	Requires threshold

Opening Element Type Standard Height 	Standard Width 	Operational Clearance
Requirements
Door 	heights \\le 15\\text{ mm}
for wheelchair roll-over.
BS 4787-1 External
Door
1994\\text{ mm} 	806, 906\\text{ mm} 	Designed for
coordinated masonry
openings.
New Construction
Entryway
2100\\text{ mm} (frame) 900\\text{ mm}
(coordination)
Must provide 800\\text{
mm} minimum effective
clear opening.
Public Entrance
Doorway
2100\\text{ mm} (frame) 1000\\text{ mm}
minimum
Required for general
public entry and egress
paths.
Windows are designed to standard dimensions while maintaining comfortable viewing angles for
seated or standing occupants. Under BS 644:2003, modular window sizes are structured in
increments of 150\\text{ mm} in height and 300\\text{ mm} in width.
To prevent visual obstructions for seated occupants, the window transom must not be located
between 900\\text{ mm} and 1200\\text{ mm} above the finished floor level.
For wheelchair users, window controls must be positioned between 800\\text{ mm} and
1100\\text{ mm} above the floor.
Safety guidelines (BS 6180:1999) require that any window opening with a sill height less than
800\\text{ mm} above the floor must include a protective barrier or be restricted to a maximum
opening of 100\\text{ mm}. Additionally, any glazing below 800\\text{ mm} must use toughened
safety glass.
To align with standard plumbing layouts, water and waste pipe sizes are specified using nominal
diameter (DN) values under BS EN ISO 6708:1996. These designations refer to either the inner
diameter (DN/ID) or outer diameter (DN/OD), providing a standardized series for building
service networks:
\\text{Preferred DN Pipe Sizes: } 10, 15, 20, 25, 32, 40, 50, 60, 65, 80, 100, 125, 150, 200, 250,
300, 350\\text{ mm[span_36](start_span)[span_36](end_span)}
Hospitality and Tourist Accommodation Typologies
The design of tourist accommodations requires balancing guest comfort, circulation efficiency,
and operational performance. Architectural programming details the layout of guest spaces,
administrative areas, and support services to establish clean spatial relationships.
Functional Zoning and Circulation Physics
The flow of guests, staff, and service vehicles must be kept separate to prevent operational
bottlenecks.
[ ENTRANCE & SERVICE VEHICLES ] ──► [ SERVICE HOUSING & LOADING ]
│ 	│
▼ 	▼
[ PUBLIC ACCESS LOBBY ] ──────────────► [ ADMINISTRATIVE CORE ]
│ 	│
▼ 	▼

[ VERTICAL CORE / ELEVATORS ] ─────────► [ GUEST ACCOMMODATIONS ]
As detailed in the RIBA Architect's Handbook, horizontal circulation routes should be kept short
and direct, with corridors and walkways limited to a maximum of 25\\% of the building's total
useful floor area.
For dining facilities within hotels, the standard space allocation is a minimum of 1.5\\text{ m}^2
per guest seat to prevent crowding and allow staff to move freely between tables.
To optimize energy performance, guest room corridors should be oriented along a North-South
axis. This orientation protects individual rooms from direct solar exposure on East and West
facades, reducing cooling loads while allowing a deviation of up to \\pm 30^\\circ to accommodate
site constraints or prevailing wind directions.
Guest Room Sizing and Layout Metrics
Hotel guest rooms are organized into distinct sleeping, working, and sanitary zones, with floor
areas and layouts scaling according to the hotel's target market and star rating.
+───────────────────────────────────────────────────+
| 	HOTEL GUEST ROOM LAYOUT 	|
+───────┬───────────────────────────────────────────+
| ENTRY │ 	BATHROOM 	|
| PATH ├───────────────────────────────────────────+
| 	│ 	|
| 	│ Sleeping Zone 	|
| 1.2 m │ - King Bed (1930 x 2030 mm) 	|
| 	│ - Aisle clearance: 450 - 610 mm 	|
| 	│ 	|
| 	├───────────────────────────────────────────+
| 	│ Work & Lounge Zone 	|
| 	│ - Desk: 1220 x 610 mm 	|
| 	│ - Balcony / Window 	|
+───────┴───────────────────────────────────────────+
Standard guest room layouts typically feature an entry door that opens into a short vestibule
flanked by a closet and a bathroom, which leads into the primary bedroom and work area near
the windows. Sizing and clearances vary across different room tiers:
Table 4: Guest Room Sizing and Symmetrical Layout Metrics
Hotel Room Class /
Star Rating
Floor Area Range
(Metric)
Floor Area (Imperial) Symmetrical Layout
Width
Budget / 1-Star
Standard
14\\text{ m}^2 to 28\\text{
m}^2
150\\text{ to } 300\\text{
sq ft}
3.0\\text{ m} (minimum
spatial envelope)
Midscale / 3-Star
Standard
28\\text{ m}^2 to 32\\text{
m}^2
300\\text{ to } 350\\text{
sq ft}
3.4\\text{ m} (supports
compact desks)
Upscale / 4-Star
Standard
32\\text{ m}^2 to 50\\text{
m}^2
350\\text{ to } 540\\text{
sq ft}
3.6\\text{ m} (standard
layout profile)
Luxury / 5-Star 	37\\text{ m}^2 to 60\\text{ 400\\text{ to } 650\\text{ 4.0\\text{ m} (allows

Hotel Room Class /
Star Rating
Floor Area Range
(Metric)
Floor Area (Imperial) Symmetrical Layout
Width
Premium 	m}^2 	sq ft} 	four-fixture baths)
Standard
One-Bedroom Suite
70\\text{ m}^2 to
100\\text{ m}^2
750\\text{ to } 1080\\text{
sq ft}
Sized with full structural
separation
Extended-Stay
Apartment
95\\text{ m}^2 to
250\\text{ m}^2
1020\\text{ to }
2690\\text{ sq ft}
Includes full kitchen
installations
To ensure standard clearances, specific spatial guidelines apply:
● Aisle Widths: The entry vestibule and main walkways must maintain a clear width of at
least 1200\\text{ mm} (4\\text{ ft}).
● Bed Clearance: Walkways at the sides and foot of standard king (1930\\text{ mm} \\times
2030\\text{ mm}) or queen (1520\\text{ mm} \\times 2030\\text{ mm}) beds must provide at
least 450\\text{ mm} to 610\\text{ mm} (18\\text{ to } 24\\text{ in}) of clearance to allow guests
to move comfortably and facilitate housekeeping tasks. This clearance is increased to
915\\text{ mm} (36\\text{ in}) in luxury hotels.
● Desk Dimensions: Work desks must be at least 1220\\text{ mm} (48\\text{ in}) in length
and 610\\text{ mm} (24\\text{ in}) in depth to accommodate laptops and documents.
● Wardrobe Footprint: Standard built-in closets require a clear depth of 610\\text{ mm}
(24\\text{ in}) and a width of at least 915\\text{ mm} (36\\text{ in}) to allow standard hangers
to clear the back wall.
● Accessible Maneuvering: To meet ADA and universal design standards, accessible
guest rooms must maintain a minimum door clearance of 815\\text{ mm} (32\\text{ in}),
requiring a 915\\text{ mm} (36\\text{ in}) door slab, and provide an unobstructed 1525\\text{
mm} (60\\text{ in}) wheelchair turning circle within the bedroom and bathroom.
Commercial Office Space Programming
Commercial office layouts must balance high spatial density with ergonomic clearances to
promote employee health and productivity.
Workstation Ergonomics and Clearance Envelopes
To design code-compliant office layouts, spaces are divided into static and dynamic zones. The
static zone represents the physical footprint of the task chair when occupied, measuring
460\\text{ mm} to 760\\text{ mm} (18\\text{ to } 30\\text{ in}) deep. The dynamic zone represents
the rollback clearance required for an employee to stand up and exit the desk, measuring
910\\text{ mm} to 1070\\text{ mm} (36\\text{ to } 42\\text{ in}) deep.
+───[span_61](start_span)[span_61](end_span)[span_65](start_span)[span
_65](end_span)────────────────────────────────────────────+
| 	OFFICE WORKSTATION DEPTH 	|
+───────────────────────────────────────────────+
| Desk Surface Depth: 610 - 760 mm 	|
+───────────────────────────────────────────────+
| Static Seating Footprint: 460 - 760 mm 	|
+───────────────────────────────────────────────+
| Dynamic Rollback Zone: 910 - 1070 mm 	|
+───────────────────────────────────────────────+

To maintain an unhindered workflow, specific layout distances are required:
● Back-to-Back Workstation Clusters: When rows of desks are arranged back-to-back,
the total edge-to-edge distance between opposing desks must be between 1980\\text{
mm} and 2440\\text{ mm} (78\\text{ to } 96\\text{ in}) to accommodate overlapping chair
rollback zones.
● Main Circulation Aisles: Primary corridors serving two-way travel must be at least
1200\\text{ mm} (48\\text{ in}) wide to ensure wheelchair accessibility.
● Secondary Walkways: Paths between rows of desks must maintain a clear width of at
least 600\\text{ mm} to 900\\text{ mm} (24\\text{ to } 36\\text{ in}).
● Wall Clearances: Desks must be set back at least 800\\text{ mm} to 900\\text{ mm}
(31\\text{ to } 35\\text{ in}) from any rear wall or column to prevent employees from feeling
trapped.
Desk dimensions vary based on employee roles, space availability, and layout strategies:
Table 5: Standard Office Desk Dimensions and Layout Clearances
Desk Classification 	Finished Width Range Finished Depth Range Clear Space
Requirements
Compact
Workstations
915\\text{ to } 1220\\text{
mm}
510\\text{ to } 610\\text{
mm}
Sized for call centers or
hot-desking zones.
Standard Office
Desks
1220\\text{ to }
1520\\text{ mm}
610\\text{ to } 760\\text{
mm}
Standard layout for
general staff
workspaces.
Large Workstations 1520\\text{ to }
1830\\text{ mm}
760\\text{ to } 915\\text{
mm}
Accommodates
multiple monitor setups.
Executive Desks 	1680\\text{ to }
2130\\text{ mm}
760\\text{ to } 1070\\text{
mm}
Designed for cellular
offices and client
reviews.
Reception Station
Counters
1830\\text{ to }
3050\\text{ mm}
610\\text{ to } 915\\text{
mm}
Serves as a
public-facing
transaction node.
Under standard corporate guidelines, such as the Government of Manitoba spatial plan,
individual workspaces are allocated a target area of 6.7\\text{ m}^2 (72\\text{ sq ft}), with desk
privacy screens set at a height of 1270\\text{ mm} (50\\text{ in}) to provide visual privacy while
seated.
In modern offices, sit-stand desks are increasingly integrated to encourage posture changes.
Under ISO 9241-5:2024 and BIFMA G1-2013 guidelines, adjustable desk heights must support
two primary operational ranges:
● Seated Range:
660\\t[span_74](start_span)[span_74](end_span)[span_76](start_span)[span_76](end_spa
n)ext{ mm} to 815\\text{ mm} (26\\text{ to } 32\\text{ in}).
● Standing Range: 965\\text{ mm} to 1220\\text{ mm} (38\\text{ to } 48\\text{ in}).
For monitor arms and cables, layouts must leave a 300\\text{ mm} to 400\\text{ mm} (12\\text{ to }
16\\text{ in}) gap between the back of the monitor and the adjacent wall.
Additionally, file cabinets and storage drawers require 400\\text{ mm} to
60[span_71](start_span)[span_71](end_span)0\\text{ mm} (16\\text{ to } 24\\text{ in}) of side

clearance to allow drawers to open fully without blocking pedestrian paths.
Educational and Cultural Assembly Typologies
Educational and cultural facilities are designed to handle high occupant densities, requiring
precise acoustic profiles, clear sightlines, and efficient egress configurations.
Educational Spatial Allocations
Traditional classrooms must accommodate different teaching methods, from standard lectures
to collaborative small-group sessions. Sizing guidelines are based on standard square footage
ratios per student:
Table 6: Educational Area Ratios and Classroom Configurations
Educational Space
Category
Area Ratio per Student
(Metric)
Area Ratio (Imperial) Planning Dimensions &
Footprints
Nursery & Preschool 2.0\\text{ m}^2 net area
per child
21.5\\text{ sq ft} per
child
Sized with low sills for
views of outdoor play.
Kindergarten / Pre-K 3.25\\text{ m}^2 net
area per child
35.0\\text{ sq ft} per
child
Must include dedicated,
self-contained
restrooms.
Elementary
Classrooms
2.80\\text{ m}^2 net
area per student
30.0\\text{ sq ft} per
student
Ceiling heights must be
at least 2.64\\text{ m}
(8\\text{ ft } 8\\text{ in}).
Secondary
Classrooms
2.32\\text{ m}^2 net
area per student
25.0\\text{ sq ft} per
student
Ceiling heights must be
at least 2.74\\text{ m}
(9\\text{ ft } 0\\text{ in}).
Collaborative
Classrooms
2.32\\text{ to } 2.80\\text{
m}^2 per student
25.0\\text{ to } 30.0\\text{
sq ft}
Features movable
furniture for group
work.
Fine Art Studios 	3.70, 4.60, 5.10\\text{
m}^2 per student
40, 50, 55\\text{ sq ft}
per student
Sized by level
(Elementary, Middle,
High).
To maintain comfortable sightlines and allow teachers to move freely, standard classrooms
feature a rectangular 8.0\\text{ m} \\times 6.0\\text{ m} footprint (approximately 500\\text{ sq ft}),
which accommodates a maximum of 49 occupants.
To prevent blockages, classrooms with a single exit door must not exceed a capacity of 49
occupants.
To ensure clear visibility of writing surfaces, a 3.0\\text{ m} (10\\text{ ft}) buffer zone must be
maintained between the primary instruction wall and the first row of student desks.
Rows of desks must be spaced at least 915\\text{ mm} (3\\text{ ft}) apart in traditional
configurations, and 1220\\text{ mm} (4\\text{ ft}) apart in computer labs.
Auditorium Acoustics and Geometric sightlines
Designing large auditoriums requires careful integration of spatial acoustics and clear sightlines.

To ensure every audience member has an unobstructed view of the stage, designers calculate
platform heights and floor slopes using the Isogonal Sight Line Method. This formula uses a
constant vertical clearance value (C-value) representing the distance from the spectator's eyes
to the top of their head, which must be a minimum of 100\\text{ mm} (4\\text{ in}), with 120\\text{
mm} (4.7\\text{ in}) recommended for optimal visibility:
h_n = h_{n-1} + C + \\frac{(h_{n-1} - H)(x_n - x_{n-1})}{x_{n-1}}\\text{}
Where:
● h_n is the eye elevation of the spectator in row n.
● h_{n-1} is the eye elevation of the spectator in the preceding row.
● C is the required vertical clearance (minimum 100\\text{ mm}).
● H is the vertical height of the focal point on the stage or screen.
● x_n is the horizontal distance from the stage focal point to the eyes in row n.
● x_{n-1} is the horizontal distance to the eyes in the preceding row.
This equation calculates a progressive curve for the seating tiers, meaning each subsequent
row requires a slightly higher riser to maintain clear sightlines over the row in front of it.
To ensure safety and accessibility in public theaters, layout clearances must comply with
standard dimensions:
● Seatway Widths: The clear horizontal space between the back of one chair to the most
forward projection of the chair behind it must be at least 300\\text{ mm} (12\\text{ in}), with
350\\text{ mm} (13.8\\text{ in}) recommended when the self-rising seat is in its upright
position.
● Row Seating Limits: Standard rows are limited to 14 seats when accessed from aisles at
both ends, and 7 seats for single-aisle access. If the row-to-row spacing is increased to
900\\text{ mm} (35.4\\text{ in}), these limits can be extended.
● Aisle Widths: Lateral circulation aisles must be at least 1100\\text{ mm} (43\\text{ in}) wide
to facilitate emergency egress. * Stepped Tiers: The vertical rise between seating levels
must be between 125\\text{ mm} and 170\\text{ mm}. A single tier of seating must not
exceed 40 continuous steps without a cross-gangway landing.
● Guardrail Standards: Guardrails installed along tiered platforms must be at least
1100\\text{ mm} high. Front-row guardrails can be reduced to 800\\text{ mm} to prevent
sightline obstructions, provided they are not positioned directly in an aisle path. Guardrails
must be engineered to withstand a horizontal load of 0.75\\text{ kN/m} at a height of
800\\text{ mm}, and 1.5\\text{ kN/m} at the top of the rail.
+─────────────────────────────────────────────────────────────+
| 	AUDITORIUM CORES AND EGRESS 	|
+─────────────────────────────────────────────────────────────+
| [STAGE] 	|
| 	│ 	|
| 	▼ Stage Clearance: >= 1500 mm 	|
| ======================================================= |
| Row 1 Seating (with integrated wheelchair slots) 	|
| Row 2 Seating 	|
| 	│ 	|
| 	▼ Standard Aisle Width: >= 1100 mm 	|
| ======================================================= |
| Landing Depths at Exits: >= 1100 mm 	|
+─────────────────────────────────────────────────────────────+

To support structural loads and control sound reflection, the auditorium's physical materials must
meet specific standards:
● Riser Platform Framing: Built using 150\\text{ mm} \\times 50\\text{ mm} structural timber
joists spaced at 400\\text{ mm} centers, with 22\\text{ mm} structural plywood decking to
support a minimum distributed load of 400\\text{ kg/m}^2.
● Acoustic Seat Upholstery: Premium auditorium seats utilize perforated leather panels
featuring 1\\tex[span_107](start_span)[span_107](end_span)t{ to } 2\\text{ mm} holes
spaced at 10\\text{ mm} intervals. This allows high-frequency sound energy to pass
through the leather and be absorbed by the internal foam cushion, preventing unwanted
sound reflections when seats are unoccupied.
● Screen Viewing Distance: The distance from the projection screen to the first row of
seats is calculated by multiplying the screen diagonal by 1.5\\text{ m}.
● Acoustic Exits: To manage emergency evacuation, the number of required exit doors
scales with the venue's capacity: at least two exits for a 20-person space, three exits for
up to 50 people, and four exits for venues accommodating 100 or more occupants.
Healthcare and Clinical Facilities
The layout of medical and clinical facilities must prioritize sterile separation to prevent
cross-contamination and support efficient patient care.
Sterile Zoning and Clinical Spatial Standards
Operating departments are planned around a strict progression through four zones of increasing
cleanliness: unrestricted, semi-restricted, restricted, and aseptic. Positive air pressure cascades
from the innermost restricted operating rooms outward to prevent the infiltration of airborne
contaminants.
[ UNRESTRICT[span_125](start_span)[span_125](end_span)ED ZONE ] (Entry
lobbies, waiting areas, changing rooms)
│
▼
[ SEMI-RESTRICTED ZONE ] (Corridors, sterile storage, nurse stations)
│
▼
[ RESTRICTED ZONE ] (Surgical prep, scrub sink alcoves)
│
▼
[ ASEPTIC ZONE ] (Operating table environment, instrument tables)
To accommodate surgical teams, sterile fields, and mobile medical equipment, clinical spaces
must meet standard spatial dimensions:
● Operating Rooms (OR): FGI Guidelines require a minimum clear floor area of 37.2\\text{
m}^2 (400\\text{ sq ft}) for standard inpatient surgical procedures. Specialized
rooms—such as orthopedic, cardiac, or neurological suites—require a minimum of
55.7\\text{ m}^2 (600\\text{ sq ft}), while hybrid operating rooms containing built-in imaging
gear require at least 60.4\\text{ m}^2 to 111.5\\text{ m}^2 (650\\text{ to } 1200\\text{ sq ft}),
excluding separate control rooms.

● Anesthesia Work Zones: A clear floor area of 2.4\\text{ m} \\times 1.8\\text{ m} (8\\text{ ft}
\\times 6\\text{ ft}) must be planned at the head of the patient bed for pre-operative
anesthesia setup, which adjusts to a 2.4\\text{ m} \\times 1.2\\text{ m} (8\\text{ ft} \\times
4\\text{ ft}) clearance envelope during active surgeries.
● Specialty Equipment Footprints: Robotic surgery control consoles require a dedicated
1.8\\text{ m} \\times 1.8\\text{ m} (6\\text{ ft} \\times 6\\text{ ft}) zone, and the surgical robot
arms require a 1.5\\text{ m} \\times 1.5\\text{ m} (5\\text{ ft} \\times 5\\text{ ft}) envelope at the
foot of the operating table.
● Recovery Wards: Sized to provide at least 7.43\\text{ m}^2 (80\\text{ sq ft}) per recovery
bed, maintaining a clear separation distance of 1.5\\text{ m} (5\\text{ ft}) between adjacent
gurneys and 1.22\\text{ m} (4\\text{ ft}) from the sides of beds to adjacent walls.
To facilitate routine sanitization, operating rooms require washable wall finishes free of open
joints or crevices, while flooring must consist of monolithic, slip-resistant materials with integral
coved wall bases carried up the wall a minimum of 152\\text{ mm} (6\\text{ in}). The minimum
finished ceiling height is 3.5\\text{ m} (11.5\\text{ ft}) to allow ceiling-mounted equipment booms to
swing freely.
Industrial, Logistics, and Infrastructure Typologies
Designing industrial facilities, logistics warehouses, and transport terminals requires aligning
structural bay configurations with the travel paths of heavy freight vehicles and passenger flows.
Logistics and Loading Dock Design
Modern distribution centers are designed with high ceilings to optimize vertical storage rack
density. Modern e-commerce and logistics buildings require a clear height of 9.7\\text{ m} to
12.2\\text{ m} (32\\text{ to } 40\\text{ ft}), whereas manufacturing plants operate with clearances of
5.5\\text{ m} to 9.1\\text{ m} (18\\text{ to } 30\\text{ ft}).
+─────────────────────────────────────────────────────────────+
| 	LOADING DOCK APRON COURT 	|
+─────────────────────────────────────────────────────────────+
| 	|
| Concrete Landing Strip: 15.2 - 18.3 m 	|
| - Thickness: 200 - 355 mm 	|
| 	|
| Grading Slope: 1.5% to 2.0% 	|
| 	|
| Apron Space Depth: 36.6 - 45.7 m 	|
| 	|
+========================= DOCK WALL =========================+
| Dock Height: 1220 - 1320 mm 	|
+─────────────────────────────────────────────────────────────+
To support these large operations, standard electrical power capacities are required:
● Light Industrial / Flex Buildings: Sized for 200\\text{ to } 400\\text{ A} service panels.
● Logistics Warehouses: Sized for 400\\text{ to } 600\\text{ A} service to support automated
sorting systems and forklift charging stations.

● Heavy Manufacturing Plants: Sized for 800\\text{ to } 2000\\text{ A} (or higher) panels
operating at 480V three-phase high-voltage power.
Loading dock doors are elevated 1220\\text{ mm} to 1320\\text{ mm} (48\\text{ to } 52\\text{ in})
above the exterior parking apron to match the heights of standard semi-trailers. Standard dock
doors measure 2.7\\text{ m} (9\\text{ ft}) in width by 3.0\\text{ m} (10\\text{ ft}) in height.
To prevent damage to building facades and ensure safe vehicle alignment, specific yard
dimensions are required:
● Dock Apron Depths: The distance from the building facade to the edge of the parking
yard must be at least 36.6\\text{ m} (120\\text{ ft}) to allow standard 16.2\\text{ m} (53\\text{
ft}) trailers to maneuver into bays, and 45.7\\text{ m} (150\\text{ ft}) or more if the yard
includes trailer storage.
● Bay Spacing: Dock door centers must be spaced at least 3.7\\text{ m} (12\\text{ ft}) apart,
and 4.0\\text{ m} (13\\text{ ft}) if open trailer doors require additional clearance. This is
increased to 4.2\\text{ m} to 4.4\\text{ m} (14\\text{ to } 14.5\\text{ ft}) for refrigerated trailers
to accommodate thermal seals.
● Structural Landing Strips: To prevent heavy trailer landing gear from rutting the asphalt,
a 15.2\\text{ m} to 18.3\\text{ m} (50\\text{ to } 60\\text{ ft}) wide concrete landing strip must
be installed immediately adjacent to the dock doors.
● Pavement Thickness: Concrete landing strips are poured to a thickness of 200\\text{ mm}
(8\\text{ in}), which can be increased to 305\\text{ mm} to 355\\text{ mm} (12\\text{ to }
14\\text{ in}) using post-tensioned slabs to handle heavy loads.
● Apron Grading: The yard pavement must maintain a minimum slope of 1.5\\% and an
optimal slope of 2.0\\% to ensure proper drainage, while limiting the slope to 3.0\\% to
prevent parked trailers from sliding.
● Tailboard Letter Boxes: When servicing trucks equipped with hydraulic tailboards, the
dock must include a recessed slot beneath the leveler pit measuring 3000\\text{ mm} wide,
at least 2400\\text{ mm} deep, and at least 400\\text{ mm} high.
● Dock Leveler Sizing: Leveler pits must measure at least 1.8\\text{ m} wide by 2.4\\text{ m}
long. The leveler's load capacity is calculated by multiplying the forklift’s gross vehicle
weight by 2.5 for standard operations, and 3.0\\text{ to } 4.0 for high-volume use.
Aviation Passenger Terminals
Aviation terminal facilities are planned using IATA guidelines to ensure efficient passenger
processing and baggage handling. Sizing calculations are based on the Peak Hour Passenger
(PHP) rate.
To determine the number of physical check-in positions required in the departure lobby,
designers use the following planning formula:
N = \\frac{(a + b) \\cdot t}{60}\\text{[span_165](start_span)[span_165](end_span)}
Where:
● N is the number of check-in positions required.
● a is the number of peak hour originating check-in parties.
● b is the number of transfer check-in parties not processed airside.
● t is the average processing time per check-in party (expressed in minutes).
To ensure an optimal level of service, aviation facilities utilize standard spatial design standards:
● Check-In Lobbies: Lobbies must provide at least 2.1\\text{ m}^2 to 2.8\\text{ m}^2 (23\\text{
to } 30\\text{ sq ft}) of queue space per passenger.
● Gate Holdrooms: Waiting areas at departure gates are sized based on the passenger

capacities of the aircraft served, allocating at least 1.4\\text{ m}^2 to 1.9\\text{ m}^2
(15\\text{ to } 20\\text{ sq ft}) of floor space per passenger.
● Baggage Claim Halls: Claim areas are sized to provide a minimum of 1.9\\text{ m}^2
(20\\text{ sq ft}) of clear space per passenger around the baggage carousel.
● Wayfinding and Circulation: Primary passenger paths should be direct and intuitive,
avoiding level changes or turns greater than 90 degrees. If walking distances from the
terminal entrance to the departure gate exceed 300\\text{ m}
(1000\\te[span_161](start_span)[span_161](end_span)xt{ ft}), the design should integrate
moving walkways to improve passenger transit.
Agricultural and Controlled Environment Agriculture
Typologies
Agricultural structures must balance structural durability with environmental controls to protect
crops and ensure livestock health.
Dairy Barn Design and Space Allocation
Modern dairy barns are planned around animal movement, specifying dimensions for stalls,
walkways, and feeding alleys to ensure animal welfare. Clearances are determined by the size
and weight of the livestock:
Table 7: Symmetrical Layout and Stall Metrics for Dairy Livestock
Livestock Weight
Category
Total Stall Length
(Closed Front)
Total Stall Length
(Open Front)
Center-to-Center
Divider Width
400\\text{ to } 500\\text{
kg}
(900\\text{-}1100\\text{
lbs})
2.29\\text{ to } 2.44\\text{
m} (90\\text{-}96\\text{
in})
1.98\\text{ to } 2.08\\text{
m} (78\\text{-}82\\text{
in})
1040\\text{ to }
1090\\text{ mm}
(41\\text{-}43\\text{ in})
500\\text{ to } 590\\text{
kg}
(1100\\text{-}1300\\text{
lbs})
2.44\\text{ to } 2.59\\text{
m} (96\\text{-}102\\text{
in})
2.03\\text{ to } 2.18\\text{
m} (80\\text{-}86\\text{
in})
1090\\text{ to }
1140\\text{ mm}
(43\\text{-}45\\text{ in})
590\\text{ to } 680\\text{
kg}
(1300\\text{-}1500\\text{
lbs})
2.59\\text{ to } 2.74\\text{
m} (102\\text{-}108\\text{
in})
2.29\\text{ to } 2.44\\text{
m} (90\\text{-}96\\text{
in})
1140\\text{ to }
1220\\text{ mm}
(45\\text{-}48\\text{ in})
680\\text{ to } 770\\text{
kg}
(1500\\text{-}1700\\text{
lbs})
2.74\\text{ to } 2.90\\text{
m} (108\\text{-}114\\text{
in})
2.44\\text{ to } 2.59\\text{
m} (96\\text{-}102\\text{
in})
1220\\text{ to }
1320\\text{ mm}
(48\\text{-}52\\text{ in})
+─────────────────────────────────────────────────────────────+
| 	DAIRY COW FREE-STALL CLEARANCE 	|
+─────────────────────────────────────────────────────────────+
| 	|

| Lunge Space: 910 - 1220 mm 	|
| - Required for cow to thrust head forward when rising 	|
| 	|
| Body resting space: 1730 - 1780 mm 	|
| 	|
| Curb Height: 180 - 200 mm 	|
| 	|
+─────────────────────────────────────────────────────────────+
To ensure proper animal health and stall hygiene, specific barn clearances apply:
● Lunge Space: To allow cows to thrust their heads forward naturally when rising, an
unobstructed lunge zone of 910\\text{ mm} to 1220\\text{ mm} (36\\text{ to } 48\\text{ in})
must be provided at the front of the stall.
● Head-to-Head Stalls: When stalls are arranged head-to-head, a total platform length of
4.9\\text{ m} to 5.5\\text{ m} (16\\text{ to } 18\\text{ ft}) is required to prevent visual or social
obstructions between opposing animals.
● Alley and Passageway Widths: Passageways between rows of stalls must be at least
2.4\\text{ m} to 3.0\\text{ m} (8\\text{ to } 10\\text{ ft}) wide, and feeding alleys must be at
least 4.2\\text{ m} (14\\text{ ft}) wide to allow cows to pass behind feeding animals.
● Curb Dimensions: Stalls must be elevated above the alley floor using concrete curbs to
maintain dry bedding. Sand-bedded stalls require a curb height of 200\\text{ mm} (8\\text{
in}) and a width of 150\\text{ mm} to 200\\text{ mm} (6\\text{ to } 8\\text{ in}). For
mattress-bedded stalls, the concrete platform is poured to a height of 180\\text{ mm}
(7\\text{ in}) with a 50\\text{ mm} (2\\text{ in}) rise to the brisket locator.
● Deterrent and Neck Rails: Neck rails must be installed between 1070\\text{ mm} and
1370\\text{ mm} (42\\text{ to } 54\\text{ in}) above the bedding surface, depending on animal
weight, to prevent cows from entering too far into the stall when standing.
● Calf Hutches: Individual calf hutches must be spaced at least 600\\text{ mm} (2\\text{ ft})
apart to prevent physical contact and reduce the transmission of airborne pathogens.
Greenhouse Engineering and CEA Spatial Layouts
Commercial greenhouses are engineered to regulate solar exposure, temperature gradients,
and relative humidity levels to optimize crop yields. Standard greenhouse sizes are categorized
by operational scale:
● Small-Scale / Pilot Houses: 93\\text{ m}^2 to 279\\text{ m}^2 (1000\\text{ - }3000\\text{ sq
ft}).
● Mid-Scale Facilities: 279\\text{ m}^2 to 929\\text{ m}^2 (3000\\text{-}10,000\\text{ sq ft}).
● Large Gutter-Connected Ranges: 929\\text{ m}^2 (10,000\\text{ sq ft}) up to several
contiguous acres. Under-gutter clearances typically range from 3.6\\text{ m} to 6.1\\text{ m}
(12\\text{ to } 20\\text{ ft}) to provide a thermal air buffer and accommodate overhead
mechanical shade screen assemblies.
+─────────────────────────────────────────────────────────────+
| 	COMMERCIAL GREENHOUSE PROFILE 	|
+─────────────────────────────────────────────────────────────+
| Roof Slope: 3:12 to 6:12 	|
| 	|
| Under-Gutter Height: 3.6 - 6.1 m 	|

| - Creates air buffer 	|
| - Accommodates shade screen assemblies 	|
| 	|
| Sidewall Vents at Bench Level 	|
+─────────────────────────────────────────────────────────────+
To maintain optimal growing conditions, specific ventilation standards apply:
● Mechanical Ventilation: Air must not travel more than 36.6\\text{ m} (120\\text{ ft}) from
inlet to exhaust fan to prevent excessive internal temperature gradients.
● Natural Ventilation: Natural ventilation systems rely on the stack effect, requiring roof
slopes between 3:12 and 6:12, paired with ridge and side vents.
● Vent Surface Area: The total openable surface area of greenhouse vents must be at
least 15\\% to 20\\% of the greenhouse floor area. Two-thirds of this vent area must be
located along the roof ridge to allow rising warm air to escape, with the remaining
one-third located along the lower side walls at bench level to pull in cooler air.
● Aisle Widths: Greenhouses must provide 915\\text{ mm} to 1220\\text{ mm} (3\\text{ to }
4\\text{ ft}) wide main aisles to accommodate carts and staff movement.
● Water Supply: Irrigated agricultural spaces require a reliable water supply sized to deliver
at least 12.2\\text{ L/m}^2 (0.3\\text{ gallons/day/sq ft}) of growing area to meet peak
summer evapotranspiration demands.
Technical Support Systems and Structural Standards
Architectural designs must integrate structural, electrical, and mechanical systems to ensure
safety and comfort.
Structural Layout Grids and Column Spacing
The selection of structural grids is determined by the functional programming of the internal
spaces.
For commercial office buildings, standard structural grids are designed around multiples of
0.6\\text{ m}, 1.2\\text{ m}, or 1.5\\text{ m} to align with standard ceiling tiles, lighting layouts, and
partition locations.
For naturally ventilated offices, structural depths are usually designed between 12\\text{ m} and
15\\text{ m}, which can be achieved with two structural spans of 6.0\\text{ m} to 7.5\\text{ m} and
columns flanking a central corridor.
For air-conditioned Class-A offices, column-free long-span configurations of 15\\text{ m} to
18\\text{ m} are standard to maximize layout flexibility.
+─────────────────────────────────────────────────────────────+
| 	TIMBER STRUCTURAL PANEL SPANS 	|
+─────────────────────────────────────────────────────────────+
| Standard mass timber panel width: 2.4 - 3.6 m 	|
| 	|
| Standard mass timber panel length: 12.2 - 18.3 m 	|
| 	|
| Optimized grid dimensions: 6.1 m increments 	|
+─────────────────────────────────────────────────────────────+

When designing with mass timber (CLT and glulam), default steel or concrete grids may need
modification to optimize timber panel spans.
Square mass timber grids typically range from 6.1\\text{ m} \\times 6.1\\text{ m} (20\\text{ ft} \\times
20\\text{ ft}) to 9.1\\text{ m} \\times 9.1\\text{ m} (30\\text{ ft} \\times 30\\text{ ft}).
To reduce mass timber floor panel thickness, intermediate purlins can be integrated to reduce
structural spans.
North American CLT panels are manufactured in widths of 2.4\\text{ m} to 3.6\\text{ m} (8\\text{ to }
12\\text{ ft}) and lengths of 12.2\\text{ m} to 18.3\\text{ m} (40\\text{ to } 60\\text{ ft}), making
modular bay increments of 6.1\\text{ m} (20\\text{ ft}) highly efficient by minimizing material
fabrication waste.
For light-framed residential and commercial structures, timber floor joist dimensions must meet
specific span and load-bearing requirements:
Table 8: Maximum Clear Spans for Timber Floor Joists (Imposed
Load: 1.5\\text{ kN/m}^2)
Joist Cross Section
(Thickness \\times
Depth)
Span at 400\\text{ mm}
Centers (C16)
Span at 600\\text{ mm}
Centers (C16)
Span at 400\\text{ mm}
Centers (C24)
47\\text{ mm} \\times
95\\text{ mm}
1.77\\text{ m} 	1.70\\text{ m} 	2.06\\text{ m}
47\\text{ mm} \\times
120\\text{ mm}
2.40\\text{ m} 	2.32\\text{ m} 	2.78\\text{ m}
47\\text{ mm} \\times
145\\text{ mm}
2.89\\text{ m} 	2.81\\text{ m} 	3.52\\text{ m}
47\\text{ mm} \\times
170\\text{ mm}
3.38\\text{ m} 	3.25\\text{ m} 	4.27\\text{ m}
Floor joists must be supported at each end by at least 100\\text{ mm} to 150\\text{ mm} of
load-bearing structure or be hung using joist hangers.
Deflection limits must be calculated to prevent cracking in plasterboard ceilings and tile finishes.
The standard limit for permanent and imposed load deflection is:
w_{fin} \\le \\frac{L}{250}\\text{[span_226](start_span)[span_226](end_span)}
For ceilings without brittle finishes, the limit is:
w_{fin} \\le \\frac{L}{150}\\text{[span_227](start_span)[span_227](end_span)}
Acoustical Comfort and Noise Isolation
Acoustic performance in commercial, residential, and educational facilities is measured using
the Sound Transmission Class (STC) rating, which quantifies decibel reduction through a wall
assembly across key speech frequencies (125\\text{ Hz} to 4000\\text{ Hz}).
+─────────────────────────────────────────────────────────────+
| 	ACOUSTICAL PERFORMANCE WALL 	|
+─────────────────────────────────────────────────────────────+
| Standard interior wall (no insulation): STC 33 	|
| - normal speech clearly understood 	|
| 	|

| Wall with fiberglass insulation: STC 39 	|
| - loud speech faintly understood 	|
| 	|
| Decoupled wall (resilient clips & insulation): STC 50+ 	|
| - loud sounds barely audible 	|
+─────────────────────────────────────────────────────────────+
To ensure speech privacy, the following STC targets are recommended:
● Standard Office to Standard Office: Sized for STC 45 to make loud speech
unintelligible between workspaces.
● Executive Office to Executive Office: Sized for STC 50 to maintain confidentiality for
executive discussions.
● Conference Rooms: Sized for STC 50 to prevent sound transmission to adjacent
corridors.
● Classrooms: Sized for STC 50 to minimize distractions from adjacent spaces.
● Classrooms to Mechanical Rooms: Sized for STC 60 to block low-frequency
mechanical rumble.
● Hotel Guest Rooms: Sized for STC 55 between rooms, and STC 50 to corridors to
ensure guest comfort.
● Multi-Family Demising Walls: Sized to meet the IBC minimum standard of STC 50 for
walls separating adjacent dwelling units and public corridors.
Achieving these ratings requires addressing mass, cavity absorption, cavity depth, stiffness,
decoupling, and damping within wall assemblies.
For example, a standard interior partition using 12.7\\text{ mm} (0.5\\text{ in}) drywall on wood
studs with empty cavities yields an STC of 33, allowing normal conversation to be heard clearly.
Adding fiberglass insulation increases the performance to STC 39, while using resilient isolation
clips or double-stud configurations to decouple the two drywall faces can raise the rating above
STC 50.
Thermal Environment and Comfort Models
To maintain healthy indoor environments, mechanical systems must satisfy the comfort criteria
defined in ASHRAE Standard 55.
Thermal comfort is evaluated using the Predicted Mean Vote (PMV) and Predicted Percentage
Dissatisfied (PPD) models, which account for both environmental and personal variables.
ASHRAE Standard 55 Comfort Zone:
-0.5 <= Predicted Mean Vote (PMV) <=
+0.5[span_251](start_span)[span_251](end_span)[span_253](start_span)[s
pan_253](end_span)[span_255](start_span)[span_255](end_span)
Predicted Percentage Dissatisfied (PPD) <=
10%[span_257](start_span)[span_257](end_span)[span_258](start_span)[sp
an_258](end_span)
To comply with ASHRAE Standard 55, six environmental and personal factors must be
evaluated collectively in the space design:
1. Air Temperature (t_a): The dry-bulb temperature of the air surrounding the occupant.
2. Mean Radiant Temperature (t_r): The uniform temperature of an imaginary enclosure in
which the radiant heat transfer from the human body is equal to the radiant heat transfer

in the actual non-uniform environment.
3. Air Velocity (v): The rate of air movement, which influences convective heat loss.
4. Relative Humidity (RH): The ratio of water vapor pressure to saturation water vapor
pressure.
5. Metabolic Rate (met): The rate of chemical energy transformation into heat by metabolic
activities within the human body (1\\text{ met} = 58.2\\text{ W/m}^2). Typical metabolic
rates range from 1.0 to 1.3 met for sedentary office tasks.
6. Clothing Insulation (clo): The thermal insulation provided by clothing assemblies (1\\text{
clo} = 0.155\\text{ m}^2\\cdot\\text{K/W}), where 0.5 clo represents standard summer attire
and 1.0 clo represents standard winter clothing.
ASHRAE Standard 55 defines the acceptable comfort zone as the combination of these
variables that achieves a PMV between -0.5 and +0.5, which corresponds to a PPD of 10\\% or
less (meaning at least 90\\% of occupants express thermal satisfaction).
To prevent localized discomfort, designers must also limit the vertical air temperature gradient
between head level (1.7\\text{ m} above floor for standing, 1.1\\text{ m} for seated) and ankle
level (0.1\\text{ m} above floor) to less than 3^\\circ\\text{C} to avoid drafts and thermal
asymmetry.
Technical Summary of Spatial Programming and
Typology Standards
The following table summarizes the key spatial, technical, and regulatory metrics across all
primary building typologies:
Table 9: Architectural Space Programming and Technical Standards
Matrix
Building Typology Primary Sizing /
Planning Standard
Minimum Corridor
Width
Acoustic Barrier
Target
Environmental
Support Metric
Residential 	Kitchen work
triangle: 3.6\\text{
to } 7.9\\text{ m}
cumulative sum.
915\\text{ mm}
(36\\text{ in})
clearance.
STC 50 (for
demising walls).
Living room
lighting target:
100\\text{ to }
300\\text{ lx}.
Hospitality 	Standard upscale
room: 32\\text{ to }
50\\text{ m}^2
(350\\text{-}540\\text
{ sq ft}).
1200\\text{ mm}
(48\\text{ in})
clearance.
STC 55 (between
guest rooms).
Orientation:
North-South guest
corridors (\\pm
30^\\circ).
Commercial
(Office)
Standard
individual
workstation:
6.7\\text{ m}^2
(72\\text{ sq ft}).
1200\\text{ mm}
(48\\text{ in}) clear
width.
STC 45 (between
standard offices).
ASHRAE 55
thermal comfort:
PMV -0.5\\text{ to }
+0.5.
Educational 	Classroom net
area: 2.3\\text{ to }
2.8\\text{ m}^2 per
1830\\text{ mm}
(72\\text{ in})
clearance.
STC 50 (between
classrooms).
Classroom lighting
target: 300\\text{ lx}
with dimming.

Building Typology Primary Sizing /
Planning Standard
Minimum Corridor
Width
Acoustic Barrier
Target
Environmental
Support Metric
student.
Healthcare 	Standard inpatient
operating room:
37.2\\text{ m}^2
(400\\text{ sq ft}).
2440\\text{ mm}
(96\\text{ in}) clear
width.
STC 50
(consultation
rooms).
Ceiling height:
3.5\\text{ m}
(11.5\\text{ ft})
under-boom.
Assembly /
Cultural
Standard seatway
clearance:
300\\text{ to }
350\\text{ mm}.
1100\\text{ mm}
(43\\text{ in}) clear
width.
STC 65+
(performance
halls).
Viewing distance:
1.5\\text{ m} \\times
screen diagonal.
Logistics /
Industrial
Standard loading
dock height:
1220\\text{ to }
1320\\text{ mm}.
1200\\text{ mm}
(forklift aisles).
STC 60 (adjacent
office zones).
Vertical clearance:
9.7\\text{ to }
12.2\\text{ m} clear
height.
Agricultural
(Barn)
Individual cow stall
footprint: 1.2\\text{
m} \\times 2.7\\text{
m}.
2.4\\text{ to }
3.0\\text{ m} free
walkways.
N/A 	Feed alley clear
width: 4.2\\text{ m}
minimum.
Agricultural
(Green)
Under-gutter
spacing height:
3.6\\text{ to }
6.1\\text{ m}.
915\\text{ mm} (cart
paths).
N/A 	Ventilation vent
area: 15\\%\\text{ to
} 20\\% of floor
footprint.
Works cited
1. The Kitchen Work Triangle - Efficient Design & Traffic Patterns - CliqStudios,
https://www.cliqstudios.com/work-triangle-floor-plan/ 2. How to design a kitchen: the complete
technical guide - BibLus - ACCA software,
https://biblus.accasoftware.com/en/how-to-design-a-kitchen-the-complete-technical-guide/ 3.
How to design a kitchen - Designing Buildings Wiki,
https://www.designingbuildings.co.uk/wiki/Kitchen_design 4. Kitchen Planning Guidelines with
Access Standards - NKBA,
https://media.nkba.org/uploads/2022/05/Kitchen-Planning-Guidelines.pdf 5. Metric Handbook:
Windows & Doors Data | PDF | Plumbing | Pipe (Fluid Conveyance),
https://www.scribd.com/document/429299716/179150978-36835343-Metric-Handbook-Planning
-and-Design-Data-pdf-pdf 6. edited by david adler - metric handbook planning and design data -
Fenix,
https://fenix.tecnico.ulisboa.pt/downloadFile/282093452092531/The-Metric-Handbook-Architect
ure-must-have.pdf 7. Strength Graded Timber & Span Tables,
https://www.bsw.co.uk/wp-content/uploads/2025/09/1499-BSW-Span-Table-2025-v2.pdf 8.
Types Of Hotel Rooms: Luxury Standards & Equipment Guide,
https://mirzaeegroup.com/types-of-hotel-rooms-guide/ 9. Hotel Room Dimensions: Standards,
Layouts, and Design - mingsun,
https://www.mingsungroup.com/article/guide-to-hotel-room-dimensions-standards-layouts-and-d
esign.html 10. Standard Hotel Room Dimensions: Tips for Creating a Comfortable and
Functional Space,
https://www.homestyler.com/article/floorplanner/standard-hotel-room-dimensions 11. Hotel

Room Layout Guide: Create Rooms Guests Will Love - RoomSketcher,
https://www.roomsketcher.com/blog/hotel-room-layouts/ 12. ADA Bathroom Requirements:
Standard Dimensions Every Business Must Follow,
https://sdlegal.law/2025/09/10/ada-bathroom-requirements-standard-dimensions-every-busines
s-must-follow/ 13. Uncrowded Corporate Office Layout | Boost Productivity - Eureka Ergonomic,
https://eurekaergonomic.com/blogs/eureka-ergonomic-blog/corporate-office-layout-rules 14.
Office Workstation Clearances Dimensions & Drawings,
https://www.dimensions.com/element/office-workstation-clearances 15. Open Office Layout
Standards & Clearances 2025 - Arcedior,
https://arcedior.com/blog/open-office-layout-standards-clearances-2025 16. Standard Desk
Dimensions Guide 2025: Office & Standing Desk Sizes - Office Furniture Plus,
https://www.officefurnitureplus.com/blog/standard-office-desk-dimensions-guide/ 17. Office
Ergonomics - Space Requirements for Office Work - CCOHS,
https://www.ccohs.ca/oshanswers/ergonomics/office/working_space.html 18. BEST
PRACTICES FOR INSTRUCTIONAL SPACE - South Carolina Department of Education,
https://ed.sc.gov/sites/scdoe/assets/file/agency/os/School-Facilities/documents/BestPracticesIns
tructionalSpace-Apr26.pdf 19. Architectural Design: Seating & Sightlines | PDF - Scribd,
https://www.scribd.com/document/938539916/An-Auditorium-is-a-Large-Enclosed-Space-Desig
ned-for-Live-Events-Like-Lectures-Performances-And-Concerts-Its-Design-Can-Vary-Based-on-
the-Function 20. CLASSROOM SPACE UTILIZATION GUIDELINES - Planning, Design and
Construction - Missouri State,
https://design.missouristate.edu/_Files/Standards/RoomLayout/ClassroomSpaceUtilizationGuid
elines.pdf 21. Classroom Space Guidelines | Cornell University,
https://dbp.cornell.edu/wp-content/uploads/2024/07/Classroom_Space_Guidelines_July_2024.p
df 22. Classroom Size and Student Space Standards | PDF - Scribd,
https://www.scribd.com/document/894898027/1-Classroom-Floor-Area-per-Student-LevelReco
mmended-AreaSources-Nursery-Pre-school-2-00-m-per-child-MySpace-Architects-Shiksha-Slid
eshare-P 23. Home Cinema Seating Layout: Sight Lines, Row Spacing, and Platform
Engineering, https://www.modenesebespoke.com/home-cinema-seating-layout-guide/ 24.
Setting Out Guidelines - Lecture Theatre Seating,
http://www.chartareaseating.com/pdfs/CAS_Blackbook_CAS_Version%20V6_15.pdf 25.
Specialties - AUDITORIUM SEATING - Sightlines and Building Codes - City Tech OpenLab,
https://openlab.citytech.cuny.edu/anzalonearch3610su2016/files/2016/06/theater_sizing.pdf 26.
Auditorium | Space Planning Guide - Rayon,
https://www.rayon.design/knowledge-base/auditorium/rules 27. Operating Room Design
Guidelines | PDF | Surgery | Lighting - Scribd, https://www.scribd.com/document/212228365/OT
28. Application Guidance - Facility Guidelines Institute,
https://fgiguidelines.org/application-guidance/ 29. Design distinctions for exam, procedure and
operating rooms | HFM Magazine,
https://www.hfmmagazine.com/articles/3764-design-distinctions-for-exam-procedure-and-operati
ng-rooms 30. An Intro to Operating Room Designs: Layout, Guidelines, & More - Avante Health
Solutions, https://avantehs.com/learn/buying-guides/intro-operating-room-design 31. Operating
rooms: floors and walls guide - Altro,
https://www.altro.com/getattachment/800ac5c0-ba37-4033-a51a-c9f22d18e4ac/Operating-room
s-floors-and-walls-guide.pdf?lang=en-AE&ext=.pdf 32. Loading Dock Equipment - Loading Dock
Design, https://loadingdocksupply.com/loading_dock_design 33. Passenger Terminal Design -
IATA,
https://www.iata.org/contentassets/d1d4d535bf1c4ba695f43e9beff8294f/passenger-terminal-des

ign.pdf 34. Industrial Property Specs: Docks, Clear Height & Power Guide | WareCRE,
https://warecre.com/cre-insights/industrial-101/loading-docks-ceiling-heights-and-power-require
ments-understanding-industrial-property-specs/ 35. HOW TO DESIGN A LOADING BAY - Stertil
Dock Products,
https://stertil-dockproducts.com/uploads/2018/01/lr_95004110-how-to-design-gb_2017-12-11.pd
f 36. Truck Court Design: Thickness, Turning Radius & Load Considerations,
https://industrialcontractorstexas.com/insights/truck-court-thickness-turning-radius 37.
Passenger terminal dimensioning - Aertec Solutions,
https://aertecsolutions.com/en/blog/dimensioning-of-passenger-terminals/ 38. The following
sections summarize and describe the methodology and rationale for developing the terminal
building requirements an,
https://www.flyspringfield.com/resources/media/user/1747686577-05-SGF-Terminal-Facility-Req
uirements-FINAL.pdf 39. Appendix 3 Passenger Terminal Planning Standards - CRP,
https://crp.trb.org/acrp0715/wp-content/themes/acrp-child/documents/112/original/Planning_Des
ign_for_Terminals_and_Facilities_Airport_Standards_Manual_Appendix_3.pdf 40. Dairy Cattle
Housing - Partners In Reproduction,
https://www.partners-in-reproduction.com/wellbeing/stress-factors/housing/ 41. Standard
Greenhouse Sizes Guide: How to Choose the Right Size for Your Growing Needs,
https://aurlant.com/standard-greenhouse-sizes-guide-how-to-choose-the-right-size-for-your-gro
wing-needs/ 42. Designing and Building Dairy Cattle Freestalls - Penn State Extension,
https://extension.psu.edu/designing-and-building-dairy-cattle-freestalls 43. Adult Cow Freestall
Dimensions, https://nydairyadmin.cce.cornell.edu/uploads/doc_317.pdf 44. Freestall Design and
Dimensions - The Dairyland Initiative,
https://thedairylandinitiative.vetmed.wisc.edu/adult-cow-housing/freestall-design-and-dimension
s/ 45. Ch10 Animal housing: Cattle housing, https://www.fao.org/4/s1250e/s1250e11.htm 46.
Small Scale Dairy Calf and Cattle Housing : Crops, Dairy, Livestock and Equine - UMass
Amherst,
https://www.umass.edu/agriculture-food-environment/crops-dairy-livestock-equine/fact-sheets/s
mall-scale-dairy-calf-cattle-housing 47. Greenhouse Vent Positioning—Strategies, Tips, and
Applications,
https://charleysgreenhouses.com/news/greenhouse-vent-positioning-strategies-tips-and-applicat
ions/ 48. Average Commercial Greenhouse Size: 5 factors | Harnois,
https://harnoisgreenhouse.com/commercial-greenhouse-size/ 49. Design and Layout of a Small
Commercial Greenhouse Operation,
https://www.umass.edu/agriculture-food-environment/greenhouse-floriculture/fact-sheets/design
-layout-of-small-commercial-greenhouse-operation 50. HS776/CV254: Physical Greenhouse
Design Considerations—Florida Greenhouse Vegetable Production Handbook, Vol 2 - Ask
IFAS, https://ask.ifas.ufl.edu/publication/CV254 51. Metric Handbook: Planning and Design Data
- Google Books,
https://books.google.com/books/about/Metric_Handbook.html?id=pnAIEQAAQBAJ 52. Design -
SteelConstruction.info, https://www.steelconstruction.info/Design 53. Creating Efficient
Structural Grids in Mass Timber Buildings - WoodWorks | Wood Products Council,
https://www.woodworks.org/resources/creating-efficient-structural-grids-in-mass-timber-buildings
/ 54. Timber Span Tables | - structural engineering,
https://civilsguide.com/resources/timber-span-tables/ 55. Recommended STC Ratings by Room
& Building Type - Commercial Acoustics,
https://commercial-acoustics.com/guides/recommended-stc-ratings/ 56. Understanding
Acoustical Wall Designs: 6 Variables That Affect STC,

https://www.nationalgypsum.com/ngconnects/blog/acoustics/understanding-acoustical-wall-desi
gns-variables-affect-stc-ratings 57. A Deep Dive into Glass Wall STC Ratings - MetroWall,
https://metro-wall.com/a-deep-dive-into-glass-wall-stc-ratings/ 58. Understanding Sound
Transmission Class (STC) Rating - Acoustical Surfaces,
https://www.acousticalsurfaces.com/blog/acoustics-education/sound-transmission-class-stc-ratin
g/ 59. Understanding Sound Transmission Class (STC) Ratings - NGC Testing Services,
https://www.ngctestingservices.com/blog/sound-transmission-class-ratings 60. Thermal Comfort
Basics: What is ASHRAE 55? | SimScale Blog,
https://www.simscale.com/blog/what-is-ashrae-55-thermal-comfort/ 61. Standard 55 – Thermal
Environmental Conditions for Human Occupancy - ASHRAE,
https://www.ashrae.org/technical-resources/bookstore/standard-55-thermal-environmental-condi
tions-for-human-occupancy 62. How ASHRAE 55 standard define comfort - tensorhvac,
https://tensorhvac.com/how-ashrae-55-standard-define-comfort 63. ANSI/ASHRAE Standard
55-2023 - Smart Air Defense,
https://smartairdefense.com/wp-content/uploads/2025/10/ASHRAE-Standard-55.pdf 64.
ANSI/ASHRAE Standard 55-2010,
https://shop.iccsafe.org/media/wysiwyg/material/8950P219-sample.pdf 65. CBE Thermal
Comfort Tool for ASHRAE-55, https://comfort.cbe.berkeley.edu/`

export const TYPOLOGIES_GUIDE_DOC: CodeDocument = parseCodeDocument({
  id: 'building-typologies-design-guide',
  jurisdiction: 'zimbabwe',
  title: 'Building Typologies Design Guide',
  text: TYPOLOGIES_GUIDE_TEXT,
})
