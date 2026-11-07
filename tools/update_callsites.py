import re

def update_artview():
    with open('app-artview.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    # 1. plaqueTitle
    c = re.sub(
        r'var plaqueTitle = w\.title \+ \(w\.yearCreated \? [^)]+\) : \x27\x27\);',
        "var titleText = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n    var plaqueTitle = titleText + (w.yearCreated ? ' · ' + w.yearCreated : '');",
        c
    )
    
    # 2. img alt
    c = c.replace('<img src="\' + h(pic.file) + \'" alt="\' + h(w.title) + \'"', '<img src="\' + h(pic.file) + \'" alt="\' + h(titleText) + \'"')
    
    # 3. av-title
    c = c.replace('<h3 class="av-title">\' + h(w.title) + \'</h3>', '<h3 class="av-title">\' + h(titleText) + \'</h3>')
    
    # 4. dialog
    c = c.replace('dialog(w.title, body, closeButtons, \'av-dialog\');', 'dialog(titleText, body, closeButtons, \'av-dialog\');')
    
    with open('app-artview.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated app-artview.js")

def update_art():
    with open('app-art.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    # In thumb(w, uid, plain)
    old_thumb = 'function thumb(w, uid, plain) {'
    new_thumb = """function thumb(w, uid, plain) {
    var title = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : (w ? w.title : '');
    var isDe = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';"""
    c = c.replace(old_thumb, new_thumb)
    
    c = c.replace("alt=\"' + h(w.title) + '\" loading=\"lazy\"></span>'", "alt=\"' + h(title) + '\" loading=\"lazy\"></span>'")
    c = c.replace("' title=\"' + h(w.title) + ' — click for the full picture\"'", "' title=\"' + h(title) + (isDe ? ' — klicken für vergrößerte Ansicht' : ' — click for the full picture') + '\"'")
    c = c.replace("'<img src=\"' + h(pic.file) + '\" alt=\"' + h(w.title) + '\" loading=\"lazy\">' +", "'<img src=\"' + h(pic.file) + '\" alt=\"' + h(title) + '\" loading=\"lazy\">' +")
    
    with open('app-art.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated app-art.js")

def update_shell():
    with open('app-shell.js', 'r', encoding='utf-8') as f:
        c = f.read()
        
    # Auction preview: line 139
    old_auc_item = """      var translateArt = window.ArtRaceArtI18n ? window.ArtRaceArtI18n.translate : function(v){return v;};"""
    new_auc_item = """      var translateArt = window.ArtRaceArtI18n ? window.ArtRaceArtI18n.translate : function(v){return v;};
      var workTitle = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle : function(work){return work ? work.title : '';};
      var wTitle = workTitle(w);"""
    c = c.replace(old_auc_item, new_auc_item)
    
    c = c.replace(
        "title=\"' + h(w.title) + ' — ' + (de ? 'Klicken für Details' : 'Click for details') + '\"'",
        "title=\"' + h(wTitle) + ' — ' + (de ? 'Klicken für Details' : 'Click for details') + '\"'"
    )
    c = c.replace(
        "<img src=\"' + h(pic.file) + '\" alt=\"' + h(w.title) + '\" loading=\"lazy\" />",
        "<img src=\"' + h(pic.file) + '\" alt=\"' + h(wTitle) + '\" loading=\"lazy\" />"
    )
    c = c.replace(
        "'<h4 class=\"auc-preview-title\">' + h(w.title) + '</h4>'",
        "'<h4 class=\"auc-preview-title\">' + h(wTitle) + '</h4>'"
    )
    
    # End-game collection card: lines 426-432
    old_end_card = """    return '<div class="end-art-card">' +
      '<div class="end-art-thumb" data-action="art" data-work="' + h(w.id) + '" role="button" tabindex="0" title="' + h(w.title) + '">' +
        (pic ? '<img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="lazy" />' : '<span class="thumb-init">' + h(w.title.slice(0, 1)) + '</span>') +
      '</div>' +
      '<div class="end-art-content">' +
        '<div class="end-art-main">' +
          '<div class="end-art-text">' +
            '<h4 class="end-art-title">' + h(w.title) + '</h4>' +"""
    
    new_end_card = """    var workTitle = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle : function(work){return work ? work.title : '';};
    var wTitle = workTitle(w);
    return '<div class="end-art-card">' +
      '<div class="end-art-thumb" data-action="art" data-work="' + h(w.id) + '" role="button" tabindex="0" title="' + h(wTitle) + '">' +
        (pic ? '<img src="' + h(pic.file) + '" alt="' + h(wTitle) + '" loading="lazy" />' : '<span class="thumb-init">' + h(wTitle.slice(0, 1)) + '</span>') +
      '</div>' +
      '<div class="end-art-content">' +
        '<div class="end-art-main">' +
          '<div class="end-art-text">' +
            '<h4 class="end-art-title">' + h(wTitle) + '</h4>' +"""
    c = c.replace(old_end_card, new_end_card)
    
    with open('app-shell.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated app-shell.js")

def update_trade():
    with open('app-trade.js', 'r', encoding='utf-8') as f:
        c = f.read()
        
    # In rowHead(inst):
    old_row_head = """    var translateArt = window.ArtRaceArtI18n ? window.ArtRaceArtI18n.translate : function(v){return v;};
    var tier=A.artTier(w);
    var facts = '<strong>'+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'Klasse ':'Class ')+tier.grade+' · ×'+tier.multiplier+' ★</strong> · '+h(translateArt(w.typeName)) + (w.medium ? ' · ' + h(translateArt(w.medium)) : '') +
                (w.dimensions ? ' · ' + h(w.dimensions) : '') + ' · rarity ' + w.rarity;
    return '<div class="row-main">' + thumb(w, inst.uid) + '<div>' +
           '<span class="title">' + h(w.title) + '</span>' +"""
           
    new_row_head = """    var translateArt = window.ArtRaceArtI18n ? window.ArtRaceArtI18n.translate : function(v){return v;};
    var workTitle = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle : function(work){return work ? work.title : '';};
    var tier=A.artTier(w);
    var facts = '<strong>'+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'Klasse ':'Class ')+tier.grade+' · ×'+tier.multiplier+' ★</strong> · '+h(translateArt(w.typeName)) + (w.medium ? ' · ' + h(translateArt(w.medium)) : '') +
                (w.dimensions ? ' · ' + h(w.dimensions) : '') + ' · rarity ' + w.rarity;
    return '<div class="row-main">' + thumb(w, inst.uid) + '<div>' +
           '<span class="title">' + h(workTitle(w)) + '</span>' +"""
    c = c.replace(old_row_head, new_row_head)
    
    # In hotel preview:
    c = c.replace(
        "var titleWithArtist = h(w.title) + (a ? ' - ' + h(a.name) : '');",
        "var wTitle = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n          var titleWithArtist = h(wTitle) + (a ? ' - ' + h(a.name) : '');"
    )
    c = c.replace(
        "(pic ? '<img src=\"' + h(pic.file) + '\" alt=\"' + h(w.title) + '\" loading=\"lazy\" />' : '<span class=\"hotel-auc-noimg\">' + h(w.title.slice(0, 1)) + '</span>')",
        "(pic ? '<img src=\"' + h(pic.file) + '\" alt=\"' + h(wTitle) + '\" loading=\"lazy\" />' : '<span class=\"hotel-auc-noimg\">' + h(wTitle.slice(0, 1)) + '</span>')"
    )
    c = c.replace(
        "(w0 ? '<span class=\"hotel-auc-painting-title\" title=\"' + h(w0.title) + '\">&bdquo;' + h(w0.title) + '&ldquo;</span>' : '')",
        "(w0 ? (function(){ var t0=(window.ArtRaceArtI18n&&window.ArtRaceArtI18n.workTitle)?window.ArtRaceArtI18n.workTitle(w0):w0.title; return '<span class=\"hotel-auc-painting-title\" title=\"' + h(t0) + '\">&bdquo;' + h(t0) + '&ldquo;</span>'; })() : '')"
    )
    
    # In auction rows: lines 728, 732
    c = c.replace(
        "'<span class=\"title\">' + h(w.title) + '</span>' +\n          '<span class=\"credit\">' + h(a ? a.name : 'Unknown') + ' · '+h(tierLabel)+'</span></div></div>'",
        "var tRow = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n      var info = open\n        ? '<div class=\"row-main\">' + thumb(w, lot.inst.uid) + '<div>' +\n          '<span class=\"title\">' + h(tRow) + '</span>' +\n          '<span class=\"credit\">' + h(a ? a.name : 'Unknown') + ' · '+h(tierLabel)+'</span></div></div>'"
    )
    
    with open('app-trade.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated app-trade.js")

def update_tutorial():
    with open('intro-tutorial.js', 'r', encoding='utf-8') as f:
        c = f.read()
        
    helper = """function getWorkTitle(w) {
  return (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : (w ? w.title : '');
}
"""
    if "function getWorkTitle" not in c:
        c = helper + c
        
    c = c.replace('title="\' + esc(artwork.w.title) + \'"', 'title="\' + esc(getWorkTitle(artwork.w)) + \'"')
    c = c.replace('alt="\' + esc(artwork.w.title) + \'"', 'alt="\' + esc(getWorkTitle(artwork.w)) + \'"')
    c = c.replace('title="\' + esc(item.w.title) + \'"', 'title="\' + esc(getWorkTitle(item.w)) + \'"')
    c = c.replace('alt="\' + esc(item.w.title) + \'"', 'alt="\' + esc(getWorkTitle(item.w)) + \'"')
    c = c.replace('(groups[w.artistId]||(groups[w.artistId]=[])).push({title:w.title,file:img.file});', '(groups[w.artistId]||(groups[w.artistId]=[])).push({title:getWorkTitle(w),file:img.file});')
    
    with open('intro-tutorial.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated intro-tutorial.js")

def update_core():
    with open('app-core.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    helper = "function workTitle(w) { return (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : (w ? w.title : ''); }"
    
    c = c.replace("log('Sold ' + w.title + ' for '", "var wt = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n      log('Sold ' + wt + ' for '")
    c = c.replace("log('Expert calls ' + w.title + ' a FORGERY", "var wtExp = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n      log('Expert calls ' + wtExp + ' a FORGERY")
    c = c.replace("log('Expert authenticates ' + w.title + ' ('", "var wtAuth = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle(w) : w.title;\n      log('Expert authenticates ' + wtAuth + ' ('")
    
    with open('app-core.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated app-core.js")

def update_spotlight():
    with open('art-spotlight.js', 'r', encoding='utf-8') as fp:
        c = fp.read()
    c = c.replace(
        '  var artist=A.artistById && A.artistById[w.artistId];\n  var de=language();',
        '  var artist=A.artistById && A.artistById[w.artistId];\n  var de=language();\n  var workTitle = (window.ArtRaceArtI18n && window.ArtRaceArtI18n.workTitle) ? window.ArtRaceArtI18n.workTitle : function(work){return work ? work.title : "";};\n  var title = workTitle(w);'
    )
    c = c.replace('alt="\'+esc(w.title)+\'"', 'alt="\'+esc(title)+\'"')
    c = c.replace('<strong>\'+esc(w.title)+\'</strong>', '<strong>\'+esc(title)+\'</strong>')
    with open('art-spotlight.js', 'w', encoding='utf-8') as fp:
        fp.write(c)
    print("Updated art-spotlight.js")

if __name__ == '__main__':
    update_artview()
    update_art()
    update_shell()
    update_trade()
    update_tutorial()
    update_core()
    update_spotlight()
