---
date: 2026-03-31
tags: [infra, database, cost, milestone]
---
Basically AWS RDS was way to expensive and needed to go, the fact it was running constantly just wasnt sustainable for me, especially because I dont think the website will be getting that much traffic. 
It was going to be around 20$/month, so I decided to migrate the DB to a neon postgres startup SQL DB that basically means the CPU runtime of the DB scales to 0 when disabled and so is free when not used. 

This fact I was able to get this to be free basically transformed the project from oh It will be fun to create but impossible to public into, oh this could actually be released to the public. 

As I was migrating the DB I also came accross some problems. turns out theres a lot of stories with null vectors which basically means that the tags names and descriptions of those fics were taking up storage for no reason.
# Mar 31 AM — DB Cleanup + Neon Migration

## What happened
- AWS RDS cost too high → migrated to **Neon serverless Postgres**
- Major Naruto fic cleanup: raised word floor from 5K → 20K words


## Cleanup 
- Before: 69,379 fics, 657 MB reported (475 MB was bloat)
- After VACUUM FULL: 182 MB actual data
- Deleted 40,306 fics (below 20K word floor)
- Migrated: **34,069 Naruto fics** (2,611 skipped — null embeddings)
- `this needs to be remembered. check the vector values for null and remove them. alot of empty space was found.`
`

## ⚠️ Security issue
Neon DB password and Gemini API key were **exposed in App Runner output logs**. Both need rotation.
- need to remove all logging from backends so this doesnt happen again.
## Links
- [[Mar 29 - Auth Planning]]
- [[Mar 31 PM - Bedrock Decision]]
