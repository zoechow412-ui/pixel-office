# Space HQ implementation status

The Hang Fai scene uses the selected space-station composition with a people-free background and a transparent 14-person atlas. Characters are individual interactive DOM objects, not people baked into a picture. Idle movement is decorative; working/waiting labels and meeting participation derive from the existing live office state. A 500 ms local state refresh does not call a model. Movement uses waypoints and is not a full collision/occlusion or skeletal walking engine.

CEO supervision scans every office once per minute. Missing owners, blocked/review work, doing tasks without an update for 30 minutes and todo tasks older than one day enter the exception list. Changed exceptions are batched into the manager digest with per-project/task deduplication. Manager follow-up respects existing caps and scheduling; it does not fabricate completion or send mail.

HQ meetings use one presenter turn for role perspectives, rather than each participant responding separately. Closing reuses the presenter's summary. This is not independent verification by 14 models. Existing independent meeting mode remains for other offices.

The workbench exposes yesterday's persisted events, source-file indices, the finance snapshot, an inbox snapshot and existing usage/cap controls. Actual business data lives under ignored `.pixel-office/`; never commit it or session credentials. Snapshot timestamps are shown. Finance records are read-only snapshots, not automatic synchronization or write-back. The formal quotation/PDF link opens the original application; it does not implement a new PDF generator.

Pending: ongoing mailbox and finance synchronization, attachment handling and reviewed send integration, complete historical document ingestion, full sprite walking frames/collision/occlusion, mobile verification and production persistence/deployment. The local app must not be reported as a completed public deployment.

Validation: build/typecheck; character knowledge isolation; layout validation/fuzz suite; coordinated meeting regression; browser movement, all 14 meeting participants, interactive Ava chat and a real finance answer against the imported snapshot. Real finance test initially hit Windows ENAMETOOLONG; large office context now goes over stdin rather than process arguments.

## Current visual preference

The user rejected the sprite-atlas scene and requested the previous pixel office. The pixel renderer is the active default again. Space artwork remains in history/assets for reference; do not reactivate it without a new request.
