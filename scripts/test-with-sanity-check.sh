#!/usr/bin/bash

# Kör typecheck
npm run typecheck
if [[ $? -ne 0 ]]; then
    exit 1
fi

npx vitest run --exclude="api/**" "$@"
vitest_status=$?

if [ -n "$IS_CLAUDE_CODE" ]; then
    sanity_counter_file="$(dirname "$0")/../node_modules/.claude_code_test_failure_sanity_counter"

    if [[ ! -f "$sanity_counter_file" ]]; then
        echo "0" >"$sanity_counter_file"
    fi

    counter="$(cat "$sanity_counter_file")"

    if [[ $vitest_status -eq 0 ]]; then
        echo "0" >"$sanity_counter_file"
    else
        counter="$((counter + 1))"
        echo "$counter" >"$sanity_counter_file"

        if [[ $counter -ge 5 ]]; then
            echo "0" >"$sanity_counter_file"
            echo "[POLICY] The test command has failed 5 times in a row, you should step back to think through before you continue. Begin by inspecting the code and data flow from beginning to end without assumptions, think of if there are facts you haven't double checked, think of if you are working on the right thing. Make sure to review what you are doing and make sure it still aligns with the user's instruction and the principles in CLAUDE.md."
        fi

        exit 1
    fi
fi
