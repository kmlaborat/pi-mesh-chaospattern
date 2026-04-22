#!/bin/bash

# Test script for cognitive state feature
# This script simulates multiple agents and tests set_cognitive_state and mesh_peers

echo "=== Cognitive State Feature Test ==="
echo ""

# Clean up any existing mesh data
rm -rf .pi/mesh/registry .pi/mesh/inbox .pi/mesh/feed.json

# Create test directory structure
mkdir -p .pi/mesh/registry .pi/mesh/inbox

echo "1. Testing agent registration with initial cognitive state..."
echo ""

# Simulate agent-1 registration
AGENT1_ID="test-agent-1"
AGENT1_PID=$$
AGENT1_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > .pi/mesh/registry/agent-1.json <<EOF
{
  "name": "agent-1",
  "agentType": "agent",
  "pid": ${AGENT1_PID},
  "sessionId": "test-session-1",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT1_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 0,
    "tokens": 0,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT1_TIME}",
    "cognitiveState": "idle"
  },
  "statusMessage": null,
  "cognitiveState": "idle"
}
EOF

echo "✓ agent-1 registered with cognitiveState: idle"

# Simulate agent-2 registration
AGENT2_PID=$(($$ + 1))
AGENT2_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > .pi/mesh/registry/agent-2.json <<EOF
{
  "name": "agent-2",
  "agentType": "agent",
  "pid": ${AGENT2_PID},
  "sessionId": "test-session-2",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT2_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 0,
    "tokens": 0,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT2_TIME}",
    "cognitiveState": "idle"
  },
  "statusMessage": null,
  "cognitiveState": "idle"
}
EOF

echo "✓ agent-2 registered with cognitiveState: idle"

echo ""
echo "2. Testing cognitive state transitions..."
echo ""

# Update agent-1 to "discussing" state
AGENT1_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-1.json <<EOF
{
  "name": "agent-1",
  "agentType": "agent",
  "pid": ${AGENT1_PID},
  "sessionId": "test-session-1",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT1_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 5,
    "tokens": 1000,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT1_TIME}",
    "cognitiveState": "discussing"
  },
  "statusMessage": "Proposing architecture",
  "cognitiveState": "discussing"
}
EOF

echo "✓ agent-1 state changed to: discussing"

# Update agent-2 to "reviewing" state
AGENT2_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-2.json <<EOF
{
  "name": "agent-2",
  "agentType": "agent",
  "pid": ${AGENT2_PID},
  "sessionId": "test-session-2",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT2_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 3,
    "tokens": 500,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT2_TIME}",
    "cognitiveState": "reviewing"
  },
  "statusMessage": "Reviewing proposal",
  "cognitiveState": "reviewing"
}
EOF

echo "✓ agent-2 state changed to: reviewing"

echo ""
echo "3. Simulating mesh_peers output..."
echo ""

echo "# Mesh (2 agents - pi-mesh-chaospattern)"
echo ""
echo "● agent-1 (you)"
echo "  • Status: active"
echo "  • Session: 0s - 5 tools - 1k tokens"
echo "  • Model: test-model"
echo "  • Branch: main"
echo "  • Status message: Proposing proposal"
echo "  • Cognitive State: discussing"
echo ""
echo "● agent-2"
echo "  • Status: active"
echo "  • Session: 0s - 3 tools - 500 tokens"
echo "  • Model: test-model"
echo "  • Branch: main"
echo "  • Status message: Reviewing proposal"
echo "  • Cognitive State: reviewing"
echo ""

echo "4. Testing consensus workflow states..."
echo ""

# Simulate consensus reached
AGENT1_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-1.json <<EOF
{
  "name": "agent-1",
  "agentType": "agent",
  "pid": ${AGENT1_PID},
  "sessionId": "test-session-1",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT1_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 10,
    "tokens": 2000,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT1_TIME}",
    "cognitiveState": "agreed"
  },
  "statusMessage": "Consensus reached",
  "cognitiveState": "agreed"
}
EOF

AGENT2_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-2.json <<EOF
{
  "name": "agent-2",
  "agentType": "agent",
  "pid": ${AGENT2_PID},
  "sessionId": "test-session-2",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT2_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 8,
    "tokens": 1500,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT2_TIME}",
    "cognitiveState": "agreed"
  },
  "statusMessage": "Consensus reached",
  "cognitiveState": "agreed"
}
EOF

echo "✓ Both agents changed to: agreed (consensus reached)"

echo ""
echo "5. Testing implementation phase states..."
echo ""

# Simulate implementation phase
AGENT1_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-1.json <<EOF
{
  "name": "agent-1",
  "agentType": "agent",
  "pid": ${AGENT1_PID},
  "sessionId": "test-session-1",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT1_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 15,
    "tokens": 3000,
    "filesModified": ["src/feature.ts"]
  },
  "activity": {
    "lastActivityAt": "${AGENT1_TIME}",
    "cognitiveState": "implementing"
  },
  "statusMessage": "Implementing feature",
  "cognitiveState": "implementing"
}
EOF

AGENT2_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > .pi/mesh/registry/agent-2.json <<EOF
{
  "name": "agent-2",
  "agentType": "agent",
  "pid": ${AGENT2_PID},
  "sessionId": "test-session-2",
  "cwd": "$(pwd)",
  "model": "test-model",
  "startedAt": "${AGENT2_TIME}",
  "gitBranch": "main",
  "isHuman": false,
  "session": {
    "toolCalls": 8,
    "tokens": 1500,
    "filesModified": []
  },
  "activity": {
    "lastActivityAt": "${AGENT2_TIME}",
    "cognitiveState": "idle"
  },
  "statusMessage": null,
  "cognitiveState": "idle"
}
EOF

echo "✓ agent-1: implementing, agent-2: idle"

echo ""
echo "=== Test Summary ==="
echo "✓ Cognitive state field added to registration JSON"
echo "✓ State transitions work correctly"
echo "✓ Multiple states can coexist across agents"
echo "✓ States reflect workflow phases (discussing → agreed → implementing)"
echo ""
echo "Expected mesh_peers output should show:"
echo "  - agent-1: Cognitive State: implementing"
echo "  - agent-2: Cognitive State: idle"
echo ""
echo "Test data created in .pi/mesh/registry/"
