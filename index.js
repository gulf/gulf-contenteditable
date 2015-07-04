/**
 * gulf-contenteditable
 * Copyright (C) 2015 Marcel Klehr <mklehr@gmx.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var gulf = require('gulf')
  , domOT = require('dom-ot')
  , MutationSummary = require('mutation-summary')
 
module.exports = function(contenteditable) {
  var doc = new gulf.EditableDocument(new gulf.MemoryAdapter, domOT)
  doc._change = function(newcontent, changes) {
    observer.disconnect()
    console.log(newcontent)
    if(changes) {
      var ops = domOT.unpackOps(changes)
      retainSelection(ops, function() {
        ops.forEach(function(op) {
          op.apply(contenteditable, /*index:*/true)
        })
      })
    }
    else {
      contenteditable.innerHTML = ''
      for(var i=0; i<newcontent.childNodes.length; i++) {
        contenteditable.appendChild(newcontent.childNodes[i].cloneNode(/*deep:*/true))
      }
      domOT.adapters.mutationSummary.createIndex(contenteditable)
    }
    observer.reconnect()
  }

  doc._collectChanges = function() {
    // changes are automatically collected by MutationSummary
  }
  
  var observer = new MutationSummary({
    rootNode: contenteditable, // (defaults to window.document)
    oldPreviousSibling: true,
    queries: [
      { all: true}
    ],
    callback: onChange
  })

  function onChange(summaries) {
    var ops = domOT.adapters.mutationSummary.import(summaries[0], contenteditable)
    ops = ops.filter(function(op) {
      // filter out changes to the root node
      if(op.path) return !!op.path.length
      else return true
    })
    if(!ops.length) return
    console.log(ops)
    doc.update(ops)
    ops.forEach(function(op) {
      op.apply(contenteditable, /*index:*/true, /*dry:*/true)
    })
  }
  
  return doc
}

function retainSelection(ops, fn) {
  var selection = window.getSelection()
        , ranges = []
  for(var i=0; i<selection.rangeCount; i++) {
    var range = selection.getRangeAt(i)
    ranges.push(domOT.transformCursor(range, ops, contenteditable))
  }
  ranges = ranges.map(function(range) {
    return { startContainer: range.startContainer
            , startOffset: range.startOffset
            , endContainer: range.endContainer
            , endOffset: range.endOffset}
  })
  fn()
  selection.removeAllRanges()
  ranges.forEach(function(r) {
    var range = new Range
    range.setStart(r.startContainer, r.startOffset)
    range.setEnd(r.endContainer, r.endOffset)
    selection.addRange(range)
  })
}