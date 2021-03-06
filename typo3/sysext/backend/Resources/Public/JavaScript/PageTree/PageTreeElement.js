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
 * Module: TYPO3/CMS/Backend/PageTree/PageTreeElement
 *
 * Main entry point of the page tree.
 */
define(['jquery',
    'TYPO3/CMS/Backend/PageTree/PageTree',
    'TYPO3/CMS/Backend/PageTree/PageTreeToolbar',
    'TYPO3/CMS/Backend/Viewport',
    'TYPO3/CMS/Backend/Icons',
  ],
  function ($, PageTree, PageTreeToolbar, Viewport, Icons) {
    'use strict';

    var PageTreeElement = {
      template:
        '<div id="typo3-pagetree" class="svg-tree">' +
          '<div>' +
            '<div id="svg-toolbar" class="svg-toolbar"></div>' +
              '<div id="typo3-pagetree-treeContainer">' +
                '<div id="typo3-pagetree-tree" class="svg-tree-wrapper" style="height:1000px;"></div>' +
              '</div>' +
            '</div>' +
        '</div>',
    };

    /**
     * Fetches tree configuration and data via ajax and renders the tree with a toolbar.
     *
     * @param {String} selector
     */
    PageTreeElement.initialize = function (selector) {
      $(document).ready(function () {
        var $element = $(selector);
        var tree = new PageTree();
        $element.append(PageTreeElement.template);
        var dataUrl = top.TYPO3.settings.ajaxUrls.page_tree_data;
        var configurationUrl = top.TYPO3.settings.ajaxUrls.page_tree_configuration;

        $.ajax({ url: configurationUrl }).done(function (configuration) {
          tree.initialize($element.find('#typo3-pagetree-tree'), $.extend(configuration, {
            dataUrl: dataUrl,
            showIcons: true,
          }));
        });

        Viewport.NavigationContainer.setComponentInstance(tree);

        if (!$('#svg-toolbar').data('tree-show-toolbar')) {
          var pageTreeToolbar = new PageTreeToolbar();
          pageTreeToolbar.initialize('#typo3-pagetree-tree');
          $('#svg-toolbar').data('tree-show-toolbar', true);

          Icons.getIcon('spinner-circle-light', Icons.sizes.small).done(function (spinner) {
            $('#typo3-pagetree-tree').append('<div class="node-loader">' + spinner + '</div>');
          });

          Icons.getIcon('spinner-circle-light', Icons.sizes.large).done(function (spinner) {
            $('.svg-tree').append('<div class="svg-tree-loader">' + spinner + '</div>');
          });
        }
      });
    };

    return PageTreeElement;
  });
