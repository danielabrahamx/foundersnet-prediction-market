# Claude AI Agent Documentation

## Repository Overview and Context

This repository contains the Movement version of FoundersNet - a prediction market dApp built on the Movement blockchain (Aptos-compatible). The architecture has been simplified for hackathon demo purposes:

**Simplified Stack:**
- Frontend: React with Vite
- Backend: Node.js/Express
- Blockchain: Movement (Aptos-compatible)
- **No Database**: Direct blockchain queries only

## Initial Analysis and Planning Process

1. **Understand the Ticket**: Read the ticket carefully to understand requirements
2. **Explore the Codebase**: Use available tools to examine repository structure
3. **Identify Key Components**: Locate frontend, backend, and blockchain integration points
4. **Plan Implementation**: Break down tasks into logical steps
5. **Verify Plan**: Double-check approach before execution

## Design Inspiration and Folder Structure Notes

- Follow existing code patterns and conventions
- Maintain TypeScript type safety throughout
- Use Movement SDK for all blockchain interactions
- Keep components modular and reusable
- Prioritize simplicity over complexity for demo purposes

## Todo List Structure

```markdown
- [ ] Task 1: Description
  - [ ] Subtask 1a
  - [ ] Subtask 1b
- [ ] Task 2: Description
```

## Plan Verification Step

Before executing any changes:
1. Review the plan for logical consistency
2. Check for potential conflicts with existing code
3. Ensure all dependencies are accounted for
4. Verify the approach aligns with project goals

## Task Execution Guidelines

1. **Simplicity Principle**: Always choose the simplest solution that works
2. **Incremental Changes**: Make small, testable changes
3. **Type Safety**: Maintain TypeScript types throughout
4. **Error Handling**: Include appropriate error handling
5. **Documentation**: Add comments only for complex logic

## Communication Requirements

At each step, provide:
- High-level explanation of what you're doing
- Why you're doing it
- Expected outcome
- Any potential issues or considerations

## Process Documentation

Append all significant actions and decisions to `docs/activity.md`:
- Major implementation steps
- Design decisions
- Issues encountered and resolutions
- Testing results

## Git Workflow

1. Make changes on the assigned branch
2. Commit changes regularly with descriptive messages
3. Push changes to remote repository
4. Follow existing commit message conventions

## Environment Setup

**No PostgreSQL needed** - this is a database-free implementation.

Required environment variables:
- `MOVEMENT_RPC_URL` - Movement blockchain RPC endpoint
- `MOVEMENT_CHAIN_ID` - Movement chain identifier
- `MOVEMENT_CONTRACT_ADDRESS` - Smart contract address
- `MOVEMENT_RESOURCE_ACCOUNT` - Resource account address
- `MOVEMENT_FAUCET_URL` - Optional faucet endpoint

## Review Process

1. Self-review all changes before finishing
2. Check for consistency with existing codebase
3. Verify all functionality works as expected
4. Provide summary of changes made
