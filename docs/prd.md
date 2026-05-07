# Product Requirements Document

## FieldNotes

FieldNotes is a mobile application for archaeologists working in the field. Its purpose is to reduce the time and effort required to complete context sheets by letting archaeologists capture observations naturally while they are on site, then turning those observations into structured documentation later. The product is especially intended to support archaeologists who face friction with typing, handwriting, spelling, numbers, or other documentation-related challenges. Instead of asking users to stop what they are doing, switch context, and fill in rigid forms in difficult field conditions, FieldNotes is designed to let them keep moving, keep observing, and keep recording.

## Product Vision

The vision for FieldNotes is to create an accessible, offline-first documentation tool that fits the reality of archaeological fieldwork. Instead of forcing archaeologists to complete formal context sheets in real time, the app allows them to capture raw observations in the moment and transform those observations into structured records later. The product should feel lightweight in the field, dependable under poor conditions, and supportive of users who find traditional written documentation difficult or slow.

## Problem and Opportunity

The core idea is simple: the archaeologist uses their phone to record voice notes while they are actively examining a trench, feature, layer, or other context in the field. They speak freely about what they see, including descriptions of soil, materials, relationships, conditions, interpretations, and measurements. The app should support a very low-friction workflow. A user should be able to create a note quickly, tap record, and continue speaking without needing to structure everything perfectly in the moment. In some cases they may hold the phone, and in others they may place it nearby or use a headset and continue narrating as they work. The application’s job is to capture this information reliably and preserve it without loss.

Because archaeological fieldwork often happens in places with poor or no connectivity, FieldNotes must work offline as a first principle. The app should not depend on Wi-Fi or mobile network access in order to create, record, or store notes. Audio recordings should be saved locally on the device and saved progressively so that the user does not lose information if the app is interrupted, the battery drops, or the session is long. Reliability of capture is one of the most important product requirements. If the user records an observation, they need to trust that it has been safely stored.

To keep fieldwork organized without introducing complexity, the app should let users group notes into simple collections or folders. These collections may represent excavation sites, areas, projects, or any practical grouping the archaeologist needs for the day’s work. Within a collection, the user can create multiple notes as they move through different contexts. The product should stay simple here: the goal is not to build a complicated content management system, but to give users just enough structure so they can separate one set of field notes from another and later process them appropriately.

## Target Users

FieldNotes is intended for archaeologists and field teams who need to record observations on site quickly and reliably. It is especially valuable for users who struggle with typing, handwriting, spelling, numeric entry, or the cognitive load of filling in formal templates while actively working. The app should support both general field efficiency and accessibility needs without separating those goals. In practice, a more accessible workflow should also be a faster workflow for the broader user base.

## Core Workflow

The expected user journey begins in the field. A user signs into the app with a lightweight account, likely using a simple authentication flow such as email plus magic link rather than a traditional password-heavy system. The account exists primarily so each person’s notes, transcripts, and generated context sheets remain associated with the correct user and can be synchronized securely. Once signed in, the archaeologist can open a collection, create a new note, and begin recording immediately. Throughout the day they may create many such recordings, all of which remain available locally on the device.

Later, when the archaeologist returns to camp or otherwise regains a reliable connection, they can choose to sync their notes. Sync is the moment when the raw field recordings move into a processing flow that turns unstructured spoken observations into useful documentation. The first stage of that flow is transcription. Each voice note should be converted into text so the information becomes searchable, reviewable, and suitable for downstream processing. The second stage is structured extraction. Using AI, the system should interpret the transcript and extract the specific information needed to populate a context sheet based on the organization’s chosen template. The end result is not just a transcript, but a usable archaeological record in the expected format.

## Key Functional Elements

- Offline-first mobile experience that allows users to create, manage, and record notes without Wi-Fi or cellular access.
- Voice-first note creation so archaeologists can describe a context naturally instead of filling structured forms in the field.
- Progressive local saving of recordings to reduce the risk of data loss during long sessions or interruptions.
- Simple collections or folders that help users organize notes by site, area, or project without adding operational complexity.
- Lightweight user accounts to separate and securely sync each user’s notes, transcripts, and generated outputs.
- Sync workflow that uploads or processes field recordings once the user has a stable connection.
- Audio transcription that converts raw recordings into readable text for later processing and review.
- AI-driven extraction of structured information from transcripts to populate an organization-specific context sheet template.
- In-app context sheet access so users can review completed outputs in a dedicated section of the product.
- PDF export or download so generated context sheets can fit existing documentation and reporting workflows.

## Product Principles

Several principles should guide implementation decisions. First, the app must optimize for trust. If users believe recordings might be lost, the product fails. Second, the app must reduce field friction rather than add it, which means fast actions, low cognitive load, and minimal form entry while on site. Third, accessibility is not a secondary feature set but a central design requirement. The same design decisions that make the app easier for neurodiverse users and users with writing or typing challenges should improve usability for the whole team. Finally, the app should respect existing archaeological workflows by producing outputs in a format the organization already recognizes.

## Processing and Output

For the next release, transcription and AI processing should happen on the server after a manual sync action. The mobile app remains responsible for offline capture and safe local storage, while the backend handles canonical transcription and later structured extraction. From the user’s perspective, recordings should move from raw audio to transcript to generated context sheet with as little manual effort as possible, but the trigger remains explicit: the user taps sync when they are ready.

Once generated, context sheets should appear in a dedicated area of the application so users can easily find the completed outputs separate from raw recordings. A user should be able to open a context sheet in the app, review it, and use it as a formal record. The presentation format is still flexible. It may be shown as a rendered digital form, as a PDF preview, or in another readable representation, but the app should also support exporting or downloading the context sheet as a PDF because that format is likely to fit existing organizational workflows.

## Success Criteria

The product succeeds if it saves archaeologists meaningful documentation time, reduces the burden of writing in the field, and improves accessibility for users who struggle with traditional note-taking methods. It should feel dependable in poor field conditions, simple enough to use with minimal training, and respectful of the way archaeologists already work. Rather than asking them to adapt to rigid software, FieldNotes should adapt to their environment and translate real field observations into structured records after the fact.

## First Release Scope

For the first version, the focus should remain tight. Users need to be able to create an account, organize notes into simple collections, record voice notes offline, store those notes safely on the device, manually sync when they have connectivity, generate transcripts, and receive context sheets inside the app with PDF export capability. More advanced collaboration, complex project administration, and deep editing workflows can wait. The initial product should prove that an offline-first, voice-first workflow can turn field observations into structured archaeological documentation in a way that is practical, accessible, and trustworthy.

## Open Questions

- Should the app eventually support optional on-device preview transcription in addition to the server-generated transcript?
- What exact context sheet template should be supported in the first release?
- How much user review and editing should happen before a generated context sheet is finalized?
- Should collections be purely personal folders, or eventually map to shared sites or projects?
- What level of audit trail is needed between the original recording, transcript, and generated sheet?
