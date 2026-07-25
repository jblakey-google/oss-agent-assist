#!/bin/bash
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# generate-aa-static-resources.sh
#
# Fetches the latest Google Cloud Agent Assist UI Modules JavaScript libraries
# (container.js, transcript.js, common.js, and companion_agent.js) and packages
# them into a zipped Salesforce Static Resource (ui_modules.resource).
#
# Read More:
# https://cloud.google.com/agent-assist/docs/ui-modules#agent-assist-features
#
# Usage:
#   npm run generate-aa-static-resources
#   or ./generate-aa-static-resources.sh
#
# WARNING & IMPORTANT NOTES:
# 1. Version Interdependence:
#    Specific versions of these UI Modules JS files are interdependent and tested
#    together. Only the pinned versions below are guaranteed to work reliably together.
#    Arbitrarily mixing or upgrading individual bundle versions can cause breaking
#    cross-module runtime errors.
#
# 2. Script Load Order:
#    These scripts have been verified and tested to load properly in the following order:
#      1. transcript.js
#      2. container.js
#      3. common.js
#      4. companion_agent.js
#    Altering or changing this load order is strongly discouraged and is likely to cause
#    breaking runtime errors or failure to initialize the UI components.
#

UIM_TRANSCRIPT_VERSION='v1.5'
UIM_CONTAINER_VERSION='v2.7'
UIM_COMMON_VERSION='v1.14'
UIM_COMPANION_AGENT_VERSION='v0.0'

# Override default version for transcript.js, container.js, common.js, and companion_agent.js
# Useful for development and bug fixing. Not recommended for production.
UIM_TRANSCRIPT_URL='https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/transcript.js'
# UIM_CONTAINER_URL='https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/container.js'
# UIM_COMMON_URL='https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/common.js'
UIM_COMPANION_AGENT_URL='https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/companion_agent.js'

# create ui_modules directory
dir_path=force-app/main/default/staticresources/ui_modules
mkdir -p ${dir_path}

# Helper function to download UI module file supporting URL overrides
download_module() {
  local file="$1"
  local version="$2"
  local override_url="$3"
  local file_path="${dir_path}/${file}.js"

  rm -f "${file_path}"
  rm -f "${file_path}.resource-meta.xml"

  local target_url
  if [ -n "${override_url}" ]; then
    target_url="${override_url}"
  elif [ -n "${version}" ]; then
    target_url="https://www.gstatic.com/agent-assist-ui-modules/${version}/${file}.js"
  else
    target_url="https://www.gstatic.com/agent-assist-ui-modules/v1.0/${file}.js"
  fi

  echo "Downloading ${file}.js from ${target_url}..."
  curl --silent --location "${target_url}" > "${file_path}"
  echo "Downloaded js and wrote ${file_path}"
}

# download transcript.js
download_module "transcript" "${UIM_TRANSCRIPT_VERSION}" "${UIM_TRANSCRIPT_URL}"

# download container.js
download_module "container" "${UIM_CONTAINER_VERSION}" "${UIM_CONTAINER_URL}"

# download common.js
download_module "common" "${UIM_COMMON_VERSION}" "${UIM_COMMON_URL}"

# download companion_agent.js
download_module "companion_agent" "${UIM_COMPANION_AGENT_VERSION}" "${UIM_COMPANION_AGENT_URL}"

# create a zip of the ui_modules directory. This avoids Salesforce size limits.
sf static-resource generate \
  --name ui_modules \
  --output-dir force-app/main/default/staticresources \
  --type application/zip