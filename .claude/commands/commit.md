---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
argument-hint: [message]
description: Stage and commit current changes
---

## Stage and Commit Changes

Stage all changes and create a git commit.

## Current Status

!`git status --short`

## Staged Changes

!`git diff --cached --stat`

## Unstaged Changes

!`git diff --stat`

## Task

1. Stage all changes with `git add .`
2. Commit with the message: $ARGUMENTS

If no message is provided, generate a concise commit message based on the
changes.
