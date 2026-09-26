# Workspace Rules & Persistent Guidelines

## Git Workflow & Automatic Push
- **Always push after updates**: After making updates, code changes, feature additions, or bug fixes, always:
  1. Run the test suite (`node test_oral_exam_suite.js`) to verify 100% pass rate.
  2. Stage the modified files (`git add`).
  3. Commit with a clear, concise conventional commit message (`git commit -m "..."`).
  4. Immediately push to the remote repository (`git push origin master`).
- Never leave requested updates uncommitted or unpushed unless explicitly requested by the user.
