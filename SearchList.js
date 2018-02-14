/**
 * Created by haywoodfu on 17/4/16.
 */

'use strict'
import {
  View,
  Text,
  StyleSheet,
  ListView,
  PixelRatio,
  Platform,
  Dimensions,
  Animated,
  TextInput
} from 'react-native'

const {State: TextInputState} = TextInput

import React, { Component } from 'react'

import {
  isCharacter,
  sTrim,
  containsChinese
} from './validator/Validator'

import CustomSearchBar from './components/CustomSearchBar.js'

import pinyin from 'js-pinyin'

import md5 from 'md5'

import CustomToolbar from './components/CustomToolbar'

import CustomTouchable from './components/CustomTouchable'

import SectionList from './components/SectionList'

import PropTypes from 'prop-types';

const statusBarSize = Platform.OS === 'ios' ? 10 : 0
const deviceWidth = Dimensions.get('window').width
const deviceHeight = Dimensions.get('window').height
const searchBarHeight = 0
const topOffset = 0
const defaultSectionHeight = 24
const defaultCellHeight = 0

export default class SearchList extends Component {

  constructor (props) {
    super(props)
    this.state = {
      isSearching: false,
      isEmpty: false,
      dataSource: new ListView.DataSource({
        getSectionData: SearchList.getSectionData,
        getRowData: SearchList.getRowData,
        rowHasChanged: (row1, row2) => {
          if (row1 !== row2) {
            return true
          } else if (row1 && row2 && row1.macher && row2.macher && row1.macher !== row1.macher) {
            return true
          } else {
            return false
          }
        },
        sectionHeaderHasChanged: (s1, s2) => s1 !== s2
      }),
      _navBarAnimatedValue: new Animated.Value(0),
      _searchBarAnimatedValue: new Animated.Value(searchBarHeight)
    }
    this.navBarYOffset = 43 + statusBarSize
    this.searchBarHeightPlus = 0
    this.searchStr = ''
    this.sectionIDs = []
    this.rowIDs = [[]]
    this.tmpSource = []
  }

  static getSectionData (dataBlob, sectionID) {
    return dataBlob[sectionID]
  }

  static getRowData (dataBlob, sectionID, rowID) {
    return dataBlob[sectionID + ':' + rowID]
  }

  componentWillMount () {

  }

  componentWillReceiveProps (nextProps) {
    if (nextProps && this.props.data !== nextProps.data) {
      this.tmpSource = Array.from(nextProps.data)
      this.initList(this.tmpSource)
    }
  }

  componentDidMount () {
    this.tmpSource = Array.from(this.props.data ? this.props.data : [])
    this.initList(this.tmpSource)

    pinyin.setOptions({checkPolyphone: false, charCase: 2})
  }

  generateSearchHandler (source) {
    let searchHandler = null
    if (containsChinese(source)) {
      searchHandler = {}
      searchHandler.charIndexerArr = []
      searchHandler.translatedStr = ''

      let translatedLength = 0
      for (let i = 0; i < source.length; i++) {
        let tempChar = source[i]

        let pinyinStr = pinyin.getFullChars(tempChar)

        let charIndexer = {}
        charIndexer.index = i
        charIndexer.startIndexInTransedStr = translatedLength
        charIndexer.endIndexInTransedStr = translatedLength + pinyinStr.length - 1
        charIndexer.pinyinStr = pinyinStr.toLowerCase()

        searchHandler.charIndexerArr.push(charIndexer)

        translatedLength += pinyinStr.length
        searchHandler.translatedStr += pinyinStr.toLowerCase()
      }
    }
    return searchHandler
  }

  orderList (srcList) {
    if (!srcList) {
      return
    }

    srcList.sort(this.props.sortFunc ? this.props.sortFunc : function (a, b) {
      if (!isCharacter(b.orderIndex)) {
        return -1
      } else if (!isCharacter(a.orderIndex)) {
        return 1
      } else if (b.orderIndex > a.orderIndex) {
        return -1
      } else if (b.orderIndex < a.orderIndex) {
        return 1
      } else {
        if (b.isCN > a.isCN) {
          return -1
        } else if (b.isCN < a.isCN) {
          return 1
        } else {
          return 0
        }
      }
    })
    this.parseList(srcList)
  }

  initList (srcList) {
    if (!srcList || srcList.length === 0) {
      return
    }
    srcList.forEach((item) => {
      if (item) {
        // 生成排序索引
        item.orderIndex = ''
        item.isCN = 0

        if (item.searchStr) {
          let tempStr = sTrim(item.searchStr)

          if (tempStr !== '') {
            // 补充首字母
            let firstChar = item.searchStr[0]

            if (containsChinese(firstChar)) {
              let pinyinChar = pinyin.getCamelChars(firstChar)

              if (pinyinChar) {
                item.orderIndex = pinyinChar.toUpperCase()
                item.isCN = 1
              }
            } else {
              item.orderIndex = firstChar.toUpperCase()
              item.isCN = 0
            }
          }
          // 对中文进行处理
          let handler = this.generateSearchHandler(item.searchStr)
          if (handler) {
            item.searchHandler = handler
          }
          if (!item.searchKey) {
            item.searchKey = md5(item.searchStr)
          }
        }
      }
    })
    this.orderList(srcList)
  }

  parseList (srcList) {
    if (!srcList) {
      return
    }
    let friendWithSection = {}
    this.sectionIDs = []
    this.rowIds = [[]]
    /* 形成如下的结构
     let dataBlob = {
     'sectionID1' : { ...section1 data },
     'sectionID1:rowID1' : { ...row1 data },
     'sectionID1:rowID2' : { ..row2 data },
     'sectionID2' : { ...section2 data },
     'sectionID2:rowID1' : { ...row1 data },
     'sectionID2:rowID2' : { ..row2 data },
     ...
     }
     let sectionIDs = [ 'sectionID1', 'sectionID2', ... ]
     let rowIDs = [ [ 'rowID1', 'rowID2' ], [ 'rowID1', 'rowID2' ], ... ]
     */
    srcList.forEach((item) => {
      if (item) {
        // 加入到section
        let orderIndex = item.orderIndex
        if (!isCharacter(item.orderIndex)) {
          orderIndex = '#'
        }
        if (!friendWithSection[orderIndex]) {
          friendWithSection[orderIndex] = orderIndex
          this.sectionIDs.push(orderIndex)
        }

        // rows组装
        // 1. 保证row数组长度和section数组长度一致
        let sectionIndex = this.sectionIDs.findIndex((tIndex) => {
          return orderIndex === tIndex
        })
        for (let i = this.rowIds.length; i <= sectionIndex; i++) {
          this.rowIds.push([])
        }
        // 2. 在section对应的数组加入row id
        let tRows = this.rowIds[sectionIndex]
        if (tRows) {
          tRows.push(item.searchKey)
        }

        // 3. 实际数据加入friendWithSection
        let itemKey = orderIndex + ':' + item.searchKey
        friendWithSection[itemKey] = item
      }
    })
    this.setState({
      isSearching: false,
      dataSource: this.state.dataSource.cloneWithRowsAndSections(friendWithSection, (!this.sectionIDs || this.sectionIDs.length === 0) ? [''] : this.sectionIDs, this.rowIds)
    })
  }

  search (input) {
    if (!this.tmpSource) {
      return
    }
    this.searchStr = input
    if (input) {
      // Removed to allow searching with spaces
      // input = sTrim(input)
      let inputLower = input.toLowerCase()
      let tempResult = []
      // 匹配历史转账姓名
      this.tmpSource.forEach((item, idx, array) => {
        if (item) {
          // 全局匹配字符
          if (item.searchStr) {
            let searchHandler = item.searchHandler
            let result = this.generateMacherInto(item.searchStr, item, inputLower, searchHandler ? searchHandler.translatedStr : '', searchHandler ? searchHandler.charIndexerArr : [])
            if (result.macher) {
              tempResult.push(result)
            }
          }
        }
      })
      if (tempResult.length === 0) {
        this.setState({
          isEmpty: true,
          isSearching: true
        })
      } else {
        this.orderResultList(tempResult)
      }
    } else {
      // 重置为原来的列表
      this.parseList(this.tmpSource)
    }
  }

  orderResultList (searchResultList) {
    if (!searchResultList) {
      this.setState({isEmpty: true, isSearching: true})
      return
    }

    searchResultList.sort(this.props.resultSortFunc ? this.props.resultSortFunc : function (a, b) {
      if (b.macher && a.macher) {
        if (b.macher.machStart < a.macher.machStart) {
          return 1
        } else if (b.macher.machStart > a.macher.machStart) {
          return -1
        } else {
          return 0
        }
      } else {
        return 0
      }
    })
    let searchResultWithSection = {'': ''}
    this.rowIds = [[]]
    let tRows = this.rowIds[0]
    searchResultList.forEach((result) => {
      tRows.push(result.searchKey)
      searchResultWithSection[':' + result.searchKey] = result
    })
    this.setState({
      isEmpty: false,
      isSearching: true,
      dataSource: this.state.dataSource.cloneWithRowsAndSections(searchResultWithSection, [''], this.rowIds)
    })
  }

  // FIXME 这个函数需要改造为一个字符串匹配多项
  generateMacherInto (source, item, inputLower, transStr, charIndexer) {
    let result = {}
    Object.assign(result, item)
    if (source) {
      let macher = {}
      macher.matches = []
      if (source.toLowerCase().indexOf(inputLower) >= 0) {
        macher.machStart = source.toLowerCase().indexOf(inputLower)
        macher.machEnd = macher.machStart + inputLower.length

        macher.matches.push({'start': macher.machStart, 'end': macher.machEnd})
        result.macher = macher
      } else {
        if (transStr && charIndexer) {
          let inputStartIndex = transStr.indexOf(inputLower)
          if (inputStartIndex >= 0) {
            for (let i = 0; i < charIndexer.length; i++) {
              let startCharIndexer = charIndexer[i]

              if (startCharIndexer) {
                if (startCharIndexer.startIndexInTransedStr === inputStartIndex) {
                  let inputEndIndex = inputStartIndex + inputLower.length - 1
                  let find = false
                  for (let j = i; j < charIndexer.length; j++) {
                    let endCharIndexer = charIndexer[j]

                    if (inputEndIndex <= endCharIndexer.endIndexInTransedStr) {
                      find = true
                      macher.machStart = startCharIndexer.index
                      macher.machEnd = endCharIndexer.index + 1
                      macher.matches.push({'start': macher.machStart, 'end': macher.machEnd})
                      result.macher = macher
                      break
                    }
                  }

                  if (find) {
                    break
                  }
                }
              }
            }
          }
        }
      }
    }

    return result
  }

  renderSectionHeader (sectionData, sectionID) {
    if (!sectionID) {
      return (
        <View />)
    } else {
      return (
        <View style={[styles.sectionHeader, {height: this.props.sectionHeaderHeight || defaultSectionHeight}]}>
          <Text style={styles.sectionTitle}>{sectionID}</Text>
        </View>)
    }
  }

  renderAlphaSection (sectionData, sectionID) {
    return (<Text style={{ color: '#171a23', fontSize: 11, width: 36, height: 14}}>{sectionID}</Text>)
  }

  renderSeparator (sectionID,
                   rowID,
                   adjacentRowHighlighted) {
    if (this.props.renderSeparator) {
      return this.props.renderSeparator(sectionID, rowID, adjacentRowHighlighted)
    } else {
      let style = styles.rowSeparator
      if (adjacentRowHighlighted) {
        style = [style, styles.rowSeparatorHide]
      }
      return (
        <View key={'SEP_' + sectionID + '_' + rowID} style={style}>
          <View style={{
            height: 1 / PixelRatio.get(),
            backgroundColor: '#efefef'
          }} />
        </View>
      )
    }
  }

  renderFooter () {
    return <View style={styles.scrollSpinner} />
  }

  renderRow (item,
             sectionID,
             rowID,
             highlightRowFunc) {
    if (this.props.renderRow) {
      return this.props.renderRow(item, sectionID, rowID, highlightRowFunc, this.state.isSearching)
    } else {
      return <View style={{flex: 1, height: this.props.cellHeight || defaultCellHeight}}>
        <Text>{item && item.searchStr ? item.searchStr : ''}</Text>
      </View>
    }
  }

  onFocus () {
    if (!this.state.isSearching) {
      this.hideBar()
    }
  }

  onBlur () {
    // this.cancelSearch()
  }

  onClickBack () {
    this.props.onClickBack && this.props.onClickBack()
  }

  onClickCancel () {
    this.showBar()
  }

  cancelSearch () {
    this.refs.searchBar && this.refs.searchBar.cancelSearch && this.refs.searchBar.cancelSearch()
  }

  showBar () {
    TextInputState.blurTextInput(TextInputState.currentlyFocusedField())

    this.state._navBarAnimatedValue.setValue(-1 * this.navBarYOffset)
    this.state._searchBarAnimatedValue.setValue(this.searchBarHeightPlus + searchBarHeight)
    Animated.parallel([
      Animated.timing(this.state._navBarAnimatedValue, {
        duration: 300,
        toValue: 0
      }),
      Animated.timing(this.state._searchBarAnimatedValue, {
        duration: 300,
        toValue: searchBarHeight
      })
    ]).start(() => {
      this.search('')
      this.setState({isSearching: false, isEmpty: false})
    })
  }

  hideBar () {
    this.state._navBarAnimatedValue.setValue(0)
    this.state._searchBarAnimatedValue.setValue(searchBarHeight)
    Animated.parallel([
      Animated.timing(this.state._navBarAnimatedValue, {
        duration: 300,
        toValue: -1 * this.navBarYOffset
      }),
      Animated.timing(this.state._searchBarAnimatedValue, {
        duration: 300,
        toValue: this.searchBarHeightPlus + searchBarHeight
      })
    ]).start(() => {
      this.setState({isSearching: true})
    })
  }

  scrollToSection (section) {
    if (!this.sectionIDs || this.sectionIDs.length === 0) {
      return
    }
    let y = 0
    let headerHeight = this.props.headerHeight || 0
    y += headerHeight

    let cellHeight = this.props.cellHeight || defaultCellHeight
    let sectionHeaderHeight = this.props.sectionHeaderHeight || defaultSectionHeight
    let index = this.sectionIDs.indexOf(section)

    let numcells = 0
    for (let i = 0; i < index && i < this.rowIds.length; i++) {
      numcells += this.rowIds[i].length
    }

    sectionHeaderHeight = index * sectionHeaderHeight
    y += numcells * cellHeight + sectionHeaderHeight

    this.refs.searchListView.scrollTo({x: 0, y: y, animated: false})

    this.props.onScrollToSection && this.props.onScrollToSection(section)
  }

  render () {
    let sectionList = !this.props.hideSectionList ? <SectionList
      style={{top: this.props.topOffset ? this.props.topOffset : 0}}
      onSectionSelect={this.scrollToSection.bind(this)}
      sections={this.sectionIDs}
      renderSection={this.props.renderAlphaSection ? this.props.renderAlphaSection : this.renderAlphaSection.bind(this)} /> : null

    let toolbar =
      <CustomToolbar
        style={[styles.toolbar, {
          opacity: this.state._navBarAnimatedValue.interpolate({
            inputRange: [-this.navBarYOffset, 1],
            outputRange: [0, 1]
          })
        }]}
        searchBarBgColor={this.props.searchBarBgColor ? this.props.searchBarBgColor : '#171a23'}
        title={this.props.title}
        hideBack={true} //Don't show back button ever
        textColor={this.props.textColor}
        leftButtonStyle={this.props.leftButtonStyle}
        backIcon={this.props.backIcon}
        backIconStyle={this.props.backIconStyle}
        onClickBack={this.onClickBack.bind(this)} />

    let mask = null
    if (this.state.isSearching && !this.searchStr) {
      mask =
        <CustomTouchable onPress={this.cancelSearch.bind(this)} underlayColor='rgba(0, 0, 0, 0.0)'
          style={styles.maskStyle}>
          <View style={styles.maskStyle} />
        </CustomTouchable>
    }

    return (
      <View
        ref='view'
        style={[{
          top: this.props.topOffset ? this.props.topOffset : topOffset,
          height: deviceHeight + 32,
          width: deviceWidth,
          backgroundColor: '#efefef'
        }, this.props.style]}>
        <Animated.View style={{
          flex: 1,
          backgroundColor: '#171a23',
          transform: [
            {translateY: this.state._navBarAnimatedValue}
          ]
        }}>
          {toolbar}
          <Animated.View style={{
            backgroundColor: this.props.searchBarBgColor ? this.props.searchBarBgColor : '#171a23',
            paddingTop: this.state._searchBarAnimatedValue
          }}>
            <CustomSearchBar placeholder={this.props.searchPlaceHolder ? this.props.searchPlaceHolder : ''}
              onChange={this.search.bind(this)}
              onFocus={this.onFocus.bind(this)}
              onBlur={this.onBlur.bind(this)}
              onClickCancel={this.onClickCancel.bind(this)}
              cancelTitle={this.props.cancelTitle}
              textColor={this.props.textColor}
              customSearchBarStyle={this.props.customSearchBarStyle}
              activeSearchBarColor={this.props.activeSearchBarColor}
              showActiveSearchIcon={this.props.showActiveSearchIcon}
              searchBarActiveColor={this.props.searchBarActiveColor}
              ref='searchBar' />
          </Animated.View>
          {(!this.state.isSearching && this.props.renderComponentAboveHeader) ? (this.props.renderComponentAboveHeader()) : null}
          <View
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={styles.listContainer}>
            {this.state.isSearching && this.state.isEmpty && this.props.emptyContent ? this.props.emptyContent(this.searchStr)
              : (this.props.data && this.props.data.length > 0 ? <ListView
                initialListSize={15}
                pageSize={10}
                onEndReachedThreshold={2000} // Reach end threshold earlier
                ref='searchListView'
                dataSource={this.state.dataSource}
                renderRow={this.renderRow.bind(this)}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='always'
                showsVerticalScrollIndicator
                renderSeparator={this.props.renderSeparator ? this.props.renderSeparator : this.renderSeparator.bind(this)}
                renderSectionHeader={this.props.renderSectionHeader ? this.props.renderSectionHeader : this.renderSectionHeader.bind(this)}
                renderFooter={this.props.renderFooter ? this.props.renderFooter : this.renderFooter.bind(this)}
                renderHeader={this.props.renderHeader && this.props.renderHeader}
                enableEmptySections /> : (this.props.renderEmpty && this.props.renderEmpty()))}
            {this.state.isSearching ? null : sectionList}
          </View>
        </Animated.View>
        {mask}
      </View>
    )
  }
}

SearchList.propTypes = {
  data: PropTypes.array.isRequired,
  renderRow: PropTypes.func.isRequired,
  cellHeight: PropTypes.number.isRequired,

  hideSectionList: PropTypes.bool,
  sectionHeaderHeight: PropTypes.number,
  topOffset: PropTypes.number,
  searchBarBgColor: PropTypes.string,
  title: PropTypes.string,
  textColor: PropTypes.string,
  cancelTitle: PropTypes.string,

  sortFunc: PropTypes.func,
  resultSortFunc: PropTypes.func,
  renderSeparator: PropTypes.func,
  renderSectionHeader: PropTypes.func,
  onClickBack: PropTypes.func,
  onScrollToSection: PropTypes.func,
  renderAlphaSection: PropTypes.func,
  showActiveSearchIcon: PropTypes.bool,
  leftButtonStyle: PropTypes.object,
  backIcon: PropTypes.number,
  backIconStyle: PropTypes.object,
  renderComponentAboveHeader: PropTypes.func
}

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  rowSeparator: {
    backgroundColor: '#fff',
    paddingLeft: 25
  },
  rowSeparatorHide: {
    opacity: 0.0
  },
  sectionHeader: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    paddingLeft: 25,
    paddingTop:3,
    backgroundColor: '#efefef'
  },
  sectionTitle: {
    color: '#979797',
    fontWeight: 'bold',
  },
  separator2: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    height: 1 / PixelRatio.get(),
    marginVertical: 1
  },
  toolbar: {
    height: 60 + statusBarSize
  },
  maskStyle: {
    position: 'absolute',
    top: -50,
    bottom: 0,
    left: 0,
    right: 0,
    height: deviceHeight + 164,
    width: deviceWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 999
  },
  scrollSpinner: {
    marginVertical: 40
  }
})

