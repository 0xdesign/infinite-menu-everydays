# Quick Debugging Guide

Common issues and their solutions for the Infinite Menu Everydays project.

## 🔴 Critical Issues

### App Won't Start

**Symptom**: Error on `npm run dev`

**Check**:
1. Environment variables set? Check `.env.local`
2. Dependencies installed? Run `npm install`
3. Port 3000 in use? Kill process or use different port

### Database Connection Failed

**Symptom**: "Failed to fetch tokens" error

**Check**:
1. Supabase credentials in `.env.local` correct?
2. Using correct project ID? (`lykbbceawbrmtursljvk` for production)
3. Network/firewall blocking Supabase?

## 🟡 Common Issues

### Colored Squares Instead of Images

**Symptom**: Gradient colored squares appear instead of NFT images

**Solution**:
1. Wait a moment - textures loading in background
2. Check console for "Switching from fallback to atlas textures"
3. Verify images loading in Network tab
4. Hard refresh if persists (Cmd+Shift+R)

### Only First 256 Items Show Correct Images

**Status**: Known limitation - only first texture atlas used

**Workaround**: Filter to specific categories to reduce item count

### Dates Showing "MAR 15, 2025"

**Solution**: Dates have been fixed to start from March 23, 2023
- If still showing wrong date, check `created_at` field in database
- Verify using Supabase MCP to query `nft_tokens` table

### Mobile Bottom Sheet Not Dragging

**Check**:
1. Touch events enabled in browser DevTools?
2. Viewport meta tag present?
3. CSS transform/transition conflicts?

### Search Not Working

**Check**:
1. 300ms debounce - type and wait
2. Check Network tab for API calls
3. Verify search RPC function exists in Supabase

### Categories Not Filtering

**Check**:
1. Category arrays populated in database?
2. `CATEGORIES` constant in `lib/supabase.ts` matches database?
3. Multi-select logic working? (ALL should clear selection)

## 🟢 Performance Issues

### Sphere Lagging on Drag

**Try**:
1. Reduce browser window size
2. Close other tabs/applications
3. Check if texture atlases fully loaded
4. Disable browser extensions

### Slow Initial Load

**Normal**: Loading 750+ images takes time
- First load downloads all texture atlases
- Subsequent loads use browser cache

### Memory Usage High

**Expected**: WebGL + 750 textures uses significant memory
- Each texture atlas is 2048x2048 pixels
- Pre-allocated matrices for performance

## 🔧 Development Tips

### Quick Checks

```bash
# Type checking
npx tsc --noEmit

# Lint check
npm run lint

# Check database connection
# Use Supabase MCP to run:
SELECT COUNT(*) FROM nft_tokens_filtered;
```

### Browser DevTools

1. **Console**: Check for WebGL errors
2. **Network**: Verify API calls and image loading
3. **Performance**: Profile render performance
4. **Application**: Check localStorage/sessionStorage

### Useful Console Commands

```javascript
// Check sphere radius
document.querySelector('canvas').__infiniteMenu.SPHERE_RADIUS

// Get current item count
document.querySelector('canvas').__infiniteMenu.itemCount

// Force texture reload
document.querySelector('canvas').__infiniteMenu.initTexture()
```

## 📱 Mobile Testing

### Desktop Browser

1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone or Android preset
4. Refresh page to trigger mobile layout

### Real Device

1. Find computer's local IP: `ifconfig | grep inet`
2. Access `http://[YOUR_IP]:3000` on mobile
3. Ensure devices on same network

## 🆘 When All Else Fails

1. **Clear everything**:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

2. **Check recent changes**:
   ```bash
   git status
   git diff
   ```

3. **Revert to known working state**:
   ```bash
   git stash
   # or
   git checkout main
   ```

4. **Ask for help** with:
   - Exact error message
   - What you were trying to do
   - What you've already tried
   - Browser/OS information

## 📞 Support Resources

- Check `CLAUDE.md` for project context
- Review `/docs/architecture/` for technical details
- Look at `/docs/plans/` for implementation decisions
- Search `/scripts/` for utility functions

---

*Last updated: September 4, 2025*