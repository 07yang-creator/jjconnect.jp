#!/usr/bin/env python3
"""Regenerate src/doushi-godan/data.js (五段動詞一覧, frequency order).

Inputs (not in the repo; both free for research/education):
  1. BCCWJ 語彙表 ver1.0 短単位  BCCWJ_frequencylist_suw_ver1_0.tsv
     https://clrd.ninjal.ac.jp/bccwj/freq-list.html → DOI 10.15084/00003218 → repository.ninjal.ac.jp/record/3234/files/…zip
  2. UniDic via the PyPI packages  fugashi + unidic-lite

    python3 -m venv venv && venv/bin/pip install fugashi unidic-lite
    venv/bin/python tools/gen_godan.py /path/to/BCCWJ_frequencylist_suw_ver1_0.tsv

How a verb gets its class: every BCCWJ row whose pos starts with 動詞 is tagged with UniDic; the parse is accepted only when
the reading of the parse equals the BCCWJ 語彙素読み and (for a one-node parse) the UniDic lemma equals the BCCWJ 語彙素.
Candidates are tried in this order: hiragana＋こと, lemma＋こと, hiragana, lemma, …＋。, …＋ので (the suffix forces the dictionary form).
Verbs UniDic cannot parse are classified by the ending rule only when it is certain (not る, or a・u・o＋る) and flagged 規則.
Rows with the same 語彙素＋読み (different pos) are merged. Only 五段 rows are written. */
"""
import csv, json, sys, collections
import fugashi, unidic_lite

SRC = sys.argv[1] if len(sys.argv) > 1 else 'BCCWJ_frequencylist_suw_ver1_0.tsv'
OUT = 'src/doushi-godan/data.js'
tagger = fugashi.Tagger('-d "%s"' % unidic_lite.DICDIR)
hira = lambda k: ''.join(chr(ord(c) - 0x60) if 0x30A1 <= ord(c) <= 0x30F6 else c for c in k)
A_U_O = set('あかさたなはまやらわがざだばぱうくすつぬふむゆるぐずづぶぷおこそとのほもよろごぞどぼぽ')
I_ROW = set('いきしちにひみりぎじぢびぴ'); E_ROW = set('えけせてねへめれげぜでべぺ')
GYO = {'う': 'ワア', 'く': 'カ', 'ぐ': 'ガ', 'す': 'サ', 'つ': 'タ', 'ぬ': 'ナ', 'ぶ': 'バ', 'む': 'マ', 'る': 'ラ'}
ALIAS = {'返る': '帰る・返る', '有る': 'ある', '成る': 'なる', '遣る': 'やる', '取る': '取る・採る・撮る・執る', '聞く': '聞く・聴く・訊く', '会う': '会う・遭う・逢う', '作る': '作る・造る・創る', '上る': '上る・昇る・登る', '回る': '回る・廻る', '計る': '計る・測る・量る・図る', '思う': '思う・想う', '言う': '言う・云う', '付く': '付く・就く', '分かる': '分かる・解る・判る', '守る': '守る・護る', '直る': '直る・治る', '行く': '行く・往く', '無くす': '無くす・亡くす', '表す': '表す・現す・著す', '下ろす': '下ろす・降ろす・卸す', '掛かる': '掛かる・懸かる・架かる', '送る': '送る・贈る', '飛ぶ': '飛ぶ・跳ぶ', '泣く': '泣く・鳴く', '直す': '直す・治す', '映る': '映る・写る', '映す': '映す・写す', '撃つ': '撃つ・討つ', '臭う': '臭う・匂う', '御座る': 'ござる（ございます）', '仕舞う': 'しまう（〜てしまう）', '頂く': 'いただく', '下さる': 'くださる', '居る': 'おる（謙譲・方言）', '入る': '入る（はいる）', '要る': '要る（いる）'}

def classify(lemma, lform):
    h = hira(lform)
    for text, strip in ((h + 'こと', 1), (lemma + 'こと', 1), (h, 0), (lemma, 0), (h + '。', 1), (lemma + '。', 1), (h + 'ので', 1), (lemma + 'ので', 1)):
        nodes = list(tagger(text))
        if strip: nodes = nodes[:-1]
        if not nodes: continue
        last = nodes[-1]
        if last.feature.pos1 != '動詞' or not last.feature.cType or last.feature.cType == '*': continue
        if ''.join((n.feature.lForm or n.surface) for n in nodes) != lform: continue
        if last.feature.cForm and not last.feature.cForm.startswith(('終止形', '連体形')): continue
        if len(nodes) == 1 and (last.feature.lemma or '') != lemma: continue
        return last.feature.cType, len(nodes)
    return None, 0

agg = {}
with open(SRC, encoding='utf-8') as fh:
    r = csv.reader(fh, delimiter='\t'); hdr = next(r); I = {h: i for i, h in enumerate(hdr)}
    for row in r:
        if len(row) < 8 or not row[I['pos']].startswith('動詞'): continue
        lemma, lform = row[I['lemma']], row[I['lForm']]
        if '■' in lemma or '■' in lform: continue
        k = (lemma, lform)
        if k in agg: agg[k]['freq'] += int(row[I['frequency']]); agg[k]['pmw'] += float(row[I['pmw']]); continue
        agg[k] = dict(lemma=lemma, lform=lform, yomi=hira(lform), wtype=row[I['wType']], freq=int(row[I['frequency']]), pmw=float(row[I['pmw']]))
rows, unk = [], []
for x in agg.values():
    ct, n = classify(x['lemma'], x['lform'])
    if ct is None:
        y = x['yomi']
        if (not y.endswith('る') or (len(y) >= 2 and y[-2] in A_U_O)) and GYO.get(y[-1]): ct, n, x['byrule'] = '五段-' + GYO[y[-1]] + '行', 1, True
        if ct is None: unk.append(x); continue
    x['ct'], x['nodes'] = ct, n; rows.append(x)
grp = lambda c: '五段' if c.startswith('五段') else '上一段' if c.startswith('上一段') else '下一段' if c.startswith('下一段') else 'サ変' if c == 'サ行変格' else 'カ変' if c == 'カ行変格' else '文語・その他'
godan = sorted([x for x in rows if grp(x['ct']) == '五段'], key=lambda x: -x['freq'])
ichidan = [x for x in rows if grp(x['ct']) in ('上一段', '下一段')]
out = []
for x in godan:
    y = x['yomi']; ie = y.endswith('る') and len(y) >= 2 and (y[-2] in I_ROW or y[-2] in E_ROW)
    flags = [f for f, c in (('ie', ie), ('混', x['wtype'] == '混'), ('複', x['nodes'] > 1), ('規則', x.get('byrule'))) if c]
    out.append([x['lemma'], y, x['ct'].split('-')[1], x['freq'], round(x['pmw'], 2), '|'.join(flags), ALIAS.get(x['lemma'], '')])
meta = dict(source='国立国語研究所『現代日本語書き言葉均衡コーパス（BCCWJ）』語彙表 ver1.0（短単位）の頻度 ＋ UniDic（unidic-lite）の活用型', verbs=len(rows), godan=len(godan), ichidan=len(ichidan), tokens=sum(x['freq'] for x in godan), unclassified=len(unk))
js = ('/* 五段動詞一覧（頻度順）。行 = [辞書形（BCCWJ 語彙素）, 読み, 行, 頻度（BCCWJ 全体）, pmw, flags, 表記のゆれ／備考]\n'
      '   来源：BCCWJ 語彙表 ver1.0 短単位（動詞 %d 个）取动词与频度，UniDic 标活用型，只保留 五段 %d 个；一段 %d，其余 する・来る・文語。\n'
      '   flags：ie＝い・え段＋る（像一段的五段）、混＝混種（片仮名・新造 等）、複＝複合動詞、規則＝UniDic 未收、按词尾规则判为五段。語彙素会合并表记变体（返る＝帰る・返る），最后一列给常见的。\n'
      '   由 tools/gen_godan.py 生成；数据仅供研究・教育用途。 */\n' % (len(rows), len(godan), len(ichidan))
      + 'const GODAN=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\nconst GODAN_META=' + json.dumps(meta, ensure_ascii=False) + ';\n')
open(OUT, 'w', encoding='utf-8').write(js)
print('verbs', len(rows), 'godan', len(godan), 'ichidan', len(ichidan), 'unclassified', len(unk), '→', OUT)
