# Kestrel Insurance: technical deep dive

25 August 2026, 90 minutes, video. Written up by June Park.

Kestrel: Tomasz Wrona, Lena Kowalczyk and Sam Adeyemi (platform engineers). Corvid: June Park.

## Their setup

- 46 pipelines in all: 31 Jenkins jobs and 15 Bamboo plans. Builds are Java and TypeScript, with
  container images pushed to their own registry.
- Builds run on 30 build servers in their data centre, shared by Jenkins and Bamboo.
- Bitbucket Server integration works with Flightline as it is. They want hosted runners with
  private networking to reach the registry; that is supported.

## Licences

- The Bamboo Data Center licence and the CloudBees support contract for Jenkins both renew on
  1 March 2027, $142,000 a year between them. Tomasz wants both gone before they renew: "I am not
  paying for three CI systems next year."
- Both vendors need written notice of non-renewal 30 days before the renewal date, so by
  29 January 2027. Tomasz will only send the notices once at least 40 pipelines run on Flightline.

## Migration plan we sketched

- The claims team's 6 pipelines go first, as the pilot, in the first two weeks of December.
- 20 pipelines on Flightline by 18 December 2026, 40 by 22 January 2027 and all 46 by
  19 February 2027.
- Jenkins and Bamboo switch to read-only on 22 February 2027.
- For Tomasz, it is done when no pipeline runs on Jenkins or Bamboo on 26 February 2027 and
  neither contract has renewed.

## Other

- They want build results posted to Slack. Works out of the box.
- Lena asked about caching Maven dependencies between builds. Shown in the demo; fine.
