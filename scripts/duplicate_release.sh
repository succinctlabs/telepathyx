# For CircomX, easily duplicate a release. This is useful for TelepathyX when we don't want to re-build/re-copy from scratch when deploying for a new source chain.
# TODO: Add logic to update the DB

set -e

# Read release id from parameters
EXISTING_RELEASE_ID=$1
NEW_RELEASE_ID=$2

# Load .env
source .env

# Print out R2_ENDPOINT, RELEASE_ID, OUTPUT_FOLDER
echo "R2_ENDPOINT: ${R2_ENDPOINT}"
echo "EXISTING_RELEASE_ID: ${EXISTING_RELEASE_ID}"
echo "NEW_RELEASE_ID: ${NEW_RELEASE_ID}"

# Copies small files with metadata (step, package.json, index.js, vkey.json)
AWS_PROFILE=r2 aws s3 cp -—recursive  s3://platform-artifacts/main/releases/${EXISTING_RELEASE_ID}/ s3://platform-artifacts/main/releases/${NEW_RELEASE_ID}/ --endpoint-url ${R2_ENDPOINT}

# Copies files with non-traditional extensions and none of their metadata (.sym, .dat, etc.)
AWS_PROFILE=r2 aws s3 cp --copy-props none -—recursive  s3://platform-artifacts/main/releases/${EXISTING_RELEASE_ID}/ s3://platform-artifacts/main/releases/${NEW_RELEASE_ID}/ --endpoint-url ${R2_ENDPOINT}