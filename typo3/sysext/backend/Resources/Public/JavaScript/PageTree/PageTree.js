/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

/**
 * Module: TYPO3/CMS/Backend/PageTree/PageTree
 */
define(['jquery',
    'd3',
    'TYPO3/CMS/Backend/Icons',
    'TYPO3/CMS/Backend/PageTree/PageTreeDragDrop',
    'TYPO3/CMS/Backend/SvgTree',
    'TYPO3/CMS/Backend/ContextMenu',
    'TYPO3/CMS/Backend/Storage/Persistent',
    'TYPO3/CMS/Backend/Notification',
  ],
  function ($, d3, Icons, PageTreeDragDrop, SvgTree, ContextMenu, Persistent, Notification) {
    'use strict';

    /**
     * @constructor
     * @exports TYPO3/CMS/Backend/PageTree/PageTree
     */
    var PageTree = function () {
      SvgTree.call(this);
    };

    PageTree.prototype = Object.create(SvgTree.prototype);
    var _super_ = SvgTree.prototype;

    /**
     * SelectTree initialization
     *
     * @param {String} selector
     * @param {Object} settings
     */
    PageTree.prototype.initialize = function (selector, settings) {
      var _this = this;

      if (!_super_.initialize.call(_this, selector, settings)) {
        return false;
      }

      _this.settings.isDragAnDrop = true;
      _this.dispatch.on('nodeSelectedAfter.pageTree', _this.nodeSelectedAfter);
      _this.dispatch.on('nodeRightClick.pageTree', _this.nodeRightClick);
      _this.dispatch.on('contextmenu.pageTree', _this.contextmenu);
      _this.dispatch.on('updateSvg.pageTree', _this.updateSvg);
      _this.dragDrop = PageTreeDragDrop;
      _this.dragDrop.init(_this);

      if (_this.settings.temporaryMountPoint) {
        _this.addMountPoint(_this.settings.temporaryMountPoint);
      }

      return this;
    };

    /**
     * Add mount point
     */
    PageTree.prototype.addMountPoint = function (breadcrumb) {
      var _this = this;

      if (_this.wrapper.parent().find('.node-mount-point').length) {
        _this.wrapper.parent().find('.node-mount-point').remove();
      }

      _this.mountPoint = _this.wrapper.before(
        '<div class="node-mount-point">' +
          '<div class="node-mount-point__icon" data-tree-icon="actions-document-info"></div>' +
          '<div class="node-mount-point__text"><div>' + breadcrumb + '</div></div>' +
          '<div class="node-mount-point__icon" data-tree-icon="actions-close" title="' + TYPO3.lang['labels.temporaryDBmount'] + '"></div>' +
        '</div>'
      );

      _this.wrapper.parent()
        .find('[data-tree-icon=actions-close]')
        .on('click', function () {
          top.TYPO3.Backend.NavigationContainer.PageTree.unsetTemporaryMountPoint();
          _this.wrapper.parent().find('.node-mount-point').remove();
        });

      //get icons
      _this.wrapper.parent().find('.node-mount-point [data-tree-icon]').each(function () {
        var $this = $(this);

        Icons.getIcon($this.attr('data-tree-icon'), Icons.sizes.small, null, null, 'inline').done(function (icon) {
          $this.append(icon);
        });
      });
    };

    PageTree.prototype.sendChangeCommand = function (data) {
      var _this = this;
      var params = '';

      if (data.target) {
        var targetUid = data.target.identifier;
        if (data.position === 'after') {
          targetUid = -targetUid;
        }
      }

      if (data.command === 'new') {
        params = '&data[pages][NEW_1][pid]=' + targetUid +
          '&data[pages][NEW_1][title]=' + data.name +
          '&data[pages][NEW_1][doktype]=' + data.type;

      } else if (data.command === 'edit') {
        params = '&data[pages][' + data.uid + '][' + data.nameSourceField + ']=' + data.title;
      } else {
        if (data.command === 'delete') {
          params = '&cmd[pages][' + data.uid + '][delete]=1';
        } else {
          params = 'cmd[pages][' + data.uid + '][' + data.command + ']=' + targetUid;
        }
      }

      _this.nodesAddPlaceholder();

      d3.request(top.TYPO3.settings.ajaxUrls.record_process)
        .header('X-Requested-With', 'XMLHttpRequest')
        .header('Content-Type', 'application/x-www-form-urlencoded')
        .post(params, function (data) {
          var response = JSON.parse(data.response);

          if (response && response.hasErrors) {
            if (response.messages) {
              $.each(response.messages, function (id, message) {
                Notification.error(
                  message.title,
                  message.message
                );
              });
            } else {
              Notification.error(
                'An error occurred',
                'Try again later');
            }

            _this.nodesContainer.selectAll('.node').remove();

            _this.update();
            _this.nodesRemovePlaceholder();
          } else {
            _this.loadData();
          }
        });
    };

    /**
     * Observer for the selectedNode event
     *
     * @param {Node} node
     */
    PageTree.prototype.nodeSelectedAfter = function (node) {
      var separator = '?';
      if (currentSubScript.indexOf('?') !== -1) {
        separator = '&';
      }

      fsMod.recentIds.web = node.identifier;
      TYPO3.Backend.ContentContainer.setUrl(
        currentSubScript + separator + 'id=' + node.identifier
      );
    };

    PageTree.prototype.nodeRightClick = function (node) {
      d3.event.preventDefault();
      var $node = $(node).closest('svg').find('.nodes .node[data-uid=' + this.identifier + ']');

      if ($node.length) {
        ContextMenu.show(
          $node.data('table'),
          this.identifier,
          $node.data('context'),
          $node.data('iteminfo'),
          $node.data('parameters')
        );
      }
    };

    PageTree.prototype.contextmenu = function (node) {
      var $node = $(node).closest('svg').find('.nodes .node[data-uid=' + this.identifier + ']');

      if ($node.length) {
        ContextMenu.show(
          $node.data('table'),
          this.identifier,
          $node.data('context'),
          $node.data('iteminfo'),
          $node.data('parameters')
        );
      }
    };

    PageTree.prototype.updateSvg = function (nodeEnter) {
      nodeEnter
        .select('use')
        .attr('data-table', 'pages');
    };

    PageTree.prototype.hideChildren = function (node) {
      _super_.hideChildren(node);
      var nodeIdHex = node.identifier.toString(16);
      Persistent.set('BackendComponents.States.Pagetree.stateHash.' + nodeIdHex, 0);
    };

    PageTree.prototype.showChildren = function (node) {
      _super_.showChildren(node);
      var nodeIdHex = node.identifier.toString(16);
      Persistent.set('BackendComponents.States.Pagetree.stateHash.' + nodeIdHex, 1);
    };

    PageTree.prototype.updateNodeBgClass = function (nodeBg) {
      return _super_.updateNodeBgClass.call(this, nodeBg).call(this.dragDrop.drag());
    };

    PageTree.prototype.nodesUpdate = function (nodes) {
      var _this = this;

      nodes = _super_.nodesUpdate.call(this, nodes)
        .call(this.dragDrop.drag());

      var nodeStop = nodes
        .append('text')
        .text('+')
        .attr('class', 'node-stop')
        .attr('dx', 30)
        .attr('dy', 5)
        .attr('visibility', function (node) {
          return (node.stopPageTree && (node.depth !== 0)) ? 'visible' : 'hidden';
        })
        .on('click', function (node) {
          _this.setTemporaryMountPoint(node.identifier);
        });

      return nodes;
    };

    /**
     * Event handler for double click on a node's label
     * Changed text position if there is 'stop page tree' option
     *
     * @param {Node} node
     */
    PageTree.prototype.appendTextElement = function (node) {
      var _this = this;
      var clicks = 0;

      _super_.appendTextElement.call(this, node)
        .attr('dx', function (node) {
          if (node.stopPageTree && node.depth !== 0) {
            return _this.textPosition + 15;
          }

          return _this.textPosition;
        })
        .on('click', function (node) {
          if (node.identifier !== 0) {
            clicks++;

            if (clicks === 1) {
              setTimeout(function () {
                if (clicks === 1) {
                  _this.clickOnLabel(node, this);
                  _this.nodeBgEvents().click(node, this);
                  _this.selectNode(node);
                } else {
                  _this.editNodeLabel(node);
                }

                clicks = 0;
              }, 300);
            }
          } else {
            _this.clickOnLabel(node, this);
            _this.nodeBgEvents().click(node, this);
            _this.selectNode(node);
          }
        });
    };

    PageTree.prototype.setTemporaryMountPoint = function (pid) {
      var params = 'pid=' + pid;
      var _this = this;

      d3.request(top.TYPO3.settings.ajaxUrls.page_tree_set_temporary_mount_point)
        .header('X-Requested-With', 'XMLHttpRequest')
        .header('Content-Type', 'application/x-www-form-urlencoded')
        .post(params, function (data) {
          var response = JSON.parse(data.response);

          if (response && response.hasErrors) {
            if (response.messages) {
              $.each(response.messages, function (id, message) {
                Notification.error(
                  message.title,
                  message.message
                );
              });
            } else {
              Notification.error(
                'An error occurred',
                'Try again later');
            }

            _this.update();
          } else {
            _this.addMountPoint(response.mountPointPath);
            _this.loadData();
          }
        });
    };

    PageTree.prototype.unsetTemporaryMountPoint = function () {
      var _this = this;
      Persistent.unset('pageTree_temporaryMountPoint').then(function () {
        _this.refreshTree();
      });
    };

    PageTree.prototype.sendEditNodeLabelCommand = function (node) {
      var _this = this;

      var params = '&data[pages][' + node.identifier + '][' + node.nameSourceField + ']=' + node.newName;

      //remove old node from svg tree
      _this.nodesAddPlaceholder(node);

      d3.request(top.TYPO3.settings.ajaxUrls.record_process)
        .header('X-Requested-With', 'XMLHttpRequest')
        .header('Content-Type', 'application/x-www-form-urlencoded')
        .post(params, function (data) {
          var response = JSON.parse(data.response);

          if (response && response.hasErrors) {
            if (response.messages) {
              $.each(response.messages, function (id, message) {
                Notification.error(
                  message.title,
                  message.message
                );
              });
            } else {
              Notification.error(
                'An error occurred',
                'Try again later');
            }

            _this.nodesAddPlaceholder();
            _this.loadData();
          } else {
            node.name = node.newName;
            _this.svg.select('.node-placeholder[data-uid="' + node.identifier + '"]').remove();
            _this.update();
            _this.nodesRemovePlaceholder();
          }
        });
    };

    PageTree.prototype.editNodeLabel = function (node) {
      var _this = this;

      _this.removeEditedText();
      _this.nodeIsEdit = true;

      d3.select(_this.svg.node().parentNode)
        .append('input')
        .attr('class', 'node-edit')
        .style('top', function () {
          var top = _this.data.nodes.indexOf(node) * _this.settings.nodeHeight;
          top = top + 15; //svg margin top
          return top + 'px';
        })
        .style('left', (node.x + _this.textPosition + 5) + 'px')
        .style('width', _this.settings.width - (node.x + _this.textPosition + 20) + 'px')
        .style('height', _this.settings.nodeHeight + 'px')
        .attr('type', 'text')
        .attr('value', node.name)
        .on('keydown', function () {
          var code = d3.event.keyCode;

          if (code === 13 || code === 9) { //enter || tab
            var newName = this.value.trim();

            if (newName.length && (newName !== node.name)) {
              _this.nodeIsEdit = false;
              _this.removeEditedText();
              node.nameSourceField = node.nameSourceField || 'title';
              node.newName = newName;
              _this.sendEditNodeLabelCommand(node);
            } else {
              _this.nodeIsEdit = false;
              _this.removeEditedText();
            }
          } else if (code === 27) { //esc
            _this.nodeIsEdit = false;
            _this.removeEditedText();
          }
        })
        .on('blur', function () {
          if (_this.nodeIsEdit) {
            var newName = this.value.trim();

            if (newName.length && (newName !== node.name)) {
              node.nameSourceField = node.nameSourceField || 'title';
              node.newName = newName;

              _this.sendEditNodeLabelCommand(node);
            }

            _this.removeEditedText();
          }
        })
        .node()
        .select();
    };

    PageTree.prototype.removeEditedText = function () {
      var _this = this;
      var inputWrapper = d3.selectAll('.node-edit');

      if (inputWrapper.size()) {
        try {
          inputWrapper.remove();
          _this.nodeIsEdit = false;
        } catch (e) {

        }
      }
    };

    return PageTree;
  });
