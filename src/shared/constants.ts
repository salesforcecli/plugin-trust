/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @description Plugins either have to be digitally signed & verified in order to be installed without being prompted, _or_ you can opt into the unsigned allowlist,
which gets saved to this filename within the CLI's local install folder. **This file name should not be updated**, because that would in turn
lead to unspecified behavior(s) downstream
 */
export const ALLOW_LIST_FILENAME = 'unsignedPluginAllowList.json';
